# 24-Hour Stability Fixes

## 1. Modbus TCP Reconnection

| Change | Reason | Effect |
|--------|--------|--------|
| `ModbusTcpClient` detects socket death via `close`/`error` events, sets `connected = false` | Previously `connected` was only set `false` in `disconnect()`. A transient network blip permanently killed the device until service restart | Device auto-detects disconnection. No more silent dead devices accumulating retries |
| `reconnect()` method with exponential backoff (1s, 2s, 4s, 8s, 16s) + 30% jitter | Without jitter, 10 devices reconnect simultaneously after a network outage, saturating the TCP stack | Staggered reconnection. Max 30s delay, max 5 attempts |
| `ModbusDevice.ensureConnected()` auto-calls reconnect on next `read()` with 10s cooldown | Without reconnect, every poll cycle generated 1 + 3 retries = 4 failed BullMQ jobs permanently | Dead device tries reconnect once per 10s. If still dead, BullMQ handles retries. No retry storms |

## 2. Database Connection Pool Tuning

| Change | Reason | Effect |
|--------|--------|--------|
| `TimescaleDBAdapter` pool: `max: 20 → 5`, `PostgresAdapter` pool: `max: 10 → 3` | Two pools totaling 30 connections on a Raspberry Pi. Each idle connection consumes ~5-10MB server-side. Too many concurrent connections cause OOM | Total pool budget: 8 connections. Fits within Pi RAM budget. Overridable via `TIMESCALE_POOL_SIZE` / `POSTGRES_POOL_SIZE` env vars |
| Added `statement_timeout: 30000ms` to both pools | A slow hypertable scan (growing data, no indexes hit) held a pool connection indefinitely. Over hours, all connections stuck → server deadlocked | Any query exceeding 30s is cancelled, connection freed. Route returns 500 instead of hanging |
| Added `idleTimeoutMillis: 30000ms` to both pools | Idle connections never closed. After hours, all 8 slots held by idle connections with session state from stale queries | Connections recycled every 30s when idle. Fresh connections for every request |
| Added `connectionTimeoutMillis: 5000ms` to both pools | No connect timeout → if DB is unreachable, `connect()` hangs forever at startup | Service fails fast on startup if DB is unreachable. Docker healthcheck handles retries |

## 3. Fastify Server Timeouts

| Change | Reason | Effect |
|--------|--------|--------|
| `requestTimeout: 30000` | No timeout at all. If a DB query hung (before `statement_timeout`), the HTTP request held the connection forever. Combined with 6 concurrent browser connections → all slots occupied → "awvs, something crash" | Server kills any request that takes >30s. Browser connection freed. Client gets 503 |
| `keepAliveTimeout: 65000` | Default keepalive (no explicit value) could hold stale connections after client disconnect. Browser connection slots weren't released | Stale connections cleaned up after 65s. Standard nginx/default HTTP practice |

## 4. React Query — Abort Signals + Backoff

| Change | Reason | Effect |
|--------|--------|--------|
| All 6 `useQuery` hooks now pass `{ signal }` from `queryFn({ signal })` to axios | When React Query cancels a query (unmount / key change / refetch), the HTTP request continued, holding a browser connection slot. No cancellation = 6 slots locked | Axios aborts in-flight request. Browser connection freed immediately. No orphaned requests |
| All 5 API service files accept `signal?: AbortSignal` parameter | Signal was available in `queryFn` context but not threaded through to `apiClient.get()` | API services now support standard AbortController pattern. Backward compatible (optional param) |
| `apiClient` timeout reduced from 300s to 30s | A hung request held a browser connection for 5 minutes. Combined with 6 concurrent pollers → permanent deadlock | Request times out in 30s. Browser retries via React Query backoff |
| `retry: 2` with exponential backoff (`1s → 2s → 4s ... max 30s`) | `retry: 1` meant 1 immediate retry. When backend was slow, retries stacked without delay | Backend has 4s between retries to recover. 2 retries max prevents retry storms |
| Explicit `gcTime: 5 * 60 * 1000` (5 minutes) | No explicit `gcTime` → TanStack Query default of 5 minutes. Not harmful but unclear | Explicit intent documented. Cache entries cleaned up after 5 minutes of inactivity |

## 5. Docker Resource Limits

| Change | Reason | Effect |
|--------|--------|--------|
| `timescaledb`: `mem_limit: 512m` | No limit. TimescaleDB could consume entire Pi RAM, causing OOM killer to terminate random containers | TimescaleDB capped at 512MB. PostgreSQL BG processes auto-tune within limit |
| `redis`: `mem_limit: 128m` | No limit. Orphaned MANAGEMENT jobs (no consumer) + BullMQ metadata accumulated in Redis unbounded | Redis capped at 128MB. LRU eviction drops oldest keys when full |
| `device-service` / `data-service` / `web-service`: `mem_limit: 256m` | No limits. A memory leak (e.g., uncollected PixiJS textures via SSR, unclosed pg connections) could OOM the Pi | Each service capped at 256MB. If exceeded, Docker kills + `restart: unless-stopped` recovers |
| `web`: `mem_limit: 128m` | nginx serving static files. No limits = could consume ~200MB unnecessarily | Nginx capped at 128MB. Plenty for static SPA serving |
| `timescaledb` PG config: `shared_buffers=32MB`, `work_mem=4MB`, `effective_cache_size=96MB`, `max_connections=50` | Defaults tuned for server-class hardware (128MB shared_buffers, 4MB work_mem, 100 connections). Pi has 2-8GB RAM shared with all services | PG memory budget: ~32MB for cache, 4MB per query sort. Total with 8 app connections = well within 512MB |
| `redis`: `maxmemory 64MB`, `allkeys-lru` eviction, no RDB/AOF persistence | Redis defaults store everything in memory + periodically dump to disk. Management jobs fill memory. Disk writes wear Pi SD card | Redis uses max 64MB. No disk writes (BullMQ metadata ephemeral). LRU drops oldest entries when full |

## 6. Graceful Device Startup

| Change | Reason | Effect |
|--------|--------|--------|
| `Promise.all` → `Promise.allSettled` for device connections | One unreachable Modbus device (e.g., powered off, wrong cable) killed the entire DeviceService at startup. All other devices couldn't start | Failed device logged with warning. Healthy devices connect and start polling. Failed device will auto-retry via reconnect logic |
| `publishTelemetry()` catches Redis write failures | Redis transient failure (network hiccup, OOM during restart) crashed the device read cycle. Telemetry data was discarded without any logging | Warning logged. Device re-reads data next poll cycle. No service crash from Redis blip |

## 7. TimescaleDB Data Lifecycle

| Change | Reason | Effect |
|--------|--------|--------|
| New hypertables get `chunk_time_interval = 1 day` | No chunk interval specified → TimescaleDB default (7 days). Queries scanning 7-day chunks are slow and memory-heavy | 1-day chunks. Time-bucket queries scan fewer rows. Compression targets individual days |
| `add_compression_policy()` auto-applied after 7 days | No compression → ~500 telemetry points × 2-5s interval = ~8.6M uncompressed rows/day. Unbounded SD card usage and slow queries | Chunks >7 days compressed. ~10x storage reduction. Queries still work transparently |
| `runRetention(deviceId, retainAfter)` method available | No way to drop old data. DB grew unbounded until SD card full → PostgreSQL crash | Callable from admin API or cron. Disabled by default until retention period decided. Configurable via `TIMESCALE_RETENTION_AFTER` env |

## 8. PixiJS Ticker Safety

| Change | Reason | Effect |
|--------|--------|--------|
| `usePixiTickerEffect`: checks `g.destroyed` before drawing | When Application is destroyed (key change on resize/refresh), Graphics objects are destroyed but ticker callbacks from `Ticker.shared` kept running with stale refs | No more drawing on destroyed Graphics (silent no-op that wasted CPU at 60fps) |
| `gRef.current = null` in effect cleanup | Old ref stayed pointing to destroyed Graphics. If a new Application reused the same component ID, it could reference a zombie object | Clean null on unmount. Fresh ref for new Application mount |
| `mountedRef` guard before draw | Ticker callback could fire between unmount start and effect cleanup (React 19 async unmount edge case) | Double guard: mounted + not destroyed. No draw calls during unmount window |

## 9. Environment Variables (all new, all optional)

| Variable | Default | Service | Purpose |
|----------|---------|---------|---------|
| `TIMESCALE_POOL_SIZE` | 5 | web-service, data-service | pg pool max connections |
| `TIMESCALE_STATEMENT_TIMEOUT_MS` | 30000 | web-service, data-service | Query timeout in ms |
| `TIMESCALE_IDLE_TIMEOUT_MS` | 30000 | web-service, data-service | Idle connection close |
| `TIMESCALE_CONNECTION_TIMEOUT_MS` | 5000 | web-service, data-service | Connection attempt timeout |
| `TIMESCALE_CHUNK_INTERVAL` | `1 day` | data-service (on hypertable create) | Hypertable chunk size |
| `TIMESCALE_COMPRESS_AFTER` | `7 days` | data-service (on hypertable create) | Auto-compress age |
| `TIMESCALE_RETENTION_AFTER` | *(disabled)* | data-service (manual `runRetention()`) | Auto-drop old chunks |
| `POSTGRES_POOL_SIZE` | 3 | web-service, device-service | Metadata pg pool max |
| `POSTGRES_STATEMENT_TIMEOUT_MS` | 15000 | web-service, device-service | Query timeout in ms |
| `POSTGRES_IDLE_TIMEOUT_MS` | 30000 | web-service, device-service | Idle connection close |
| `POSTGRES_CONNECTION_TIMEOUT_MS` | 5000 | web-service, device-service | Connection attempt timeout |

---

## Files Changed (17 total)

| File | Change type |
|------|------------|
| `packages/core/src/modbus/client.ts` | Socket lifecycle listeners, `reconnect()`, `cleanupSocket()` |
| `packages/core/src/modbus/device.ts` | `ensureConnected()`, `reconnectCooldownMs` state |
| `packages/core/src/timeseries/timescaledb-adapter.ts` | Pool timeouts, smaller pool, `setupCompression()`, `runRetention()`, chunk interval |
| `packages/core/src/sql/postgres-adapter.ts` | Pool timeouts, smaller pool |
| `packages/services/web-service/src/presentation/server.ts` | `requestTimeout`, `keepAliveTimeout` |
| `apps/web/src/lib/api-client.ts` | Timeout 300s → 30s |
| `apps/web/src/lib/query-client.ts` | `retry: 2`, backoff, `gcTime` |
| `apps/web/src/hooks/useChargeStatus.ts` | `{ signal }` passed to axios |
| `apps/web/src/hooks/useTelemetryProvider.ts` | `{ signal }` passed to axios |
| `apps/web/src/hooks/useEventAnnotations.ts` | `{ signal }` passed to api |
| `apps/web/src/features/racks/hooks/useRacksData.ts` | `{ signal }` passed to api |
| `apps/web/src/features/hvac/hooks/useHvacData.ts` | `{ signal }` passed to api |
| `apps/web/src/features/dashboard/hooks/useDashboardData.ts` | `{ signal }` passed to axios |
| `apps/web/src/features/racks/services/racksApi.ts` | `signal?` param |
| `apps/web/src/features/hvac/services/hvacApi.ts` | `signal?` param |
| `apps/web/src/features/devices/services/devicesApi.ts` | `signal?` param |
| `apps/web/src/features/logs/services/logsApi.ts` | `signal?` param |
| `packages/services/device-service/src/device-service.ts` | `Promise.allSettled` connect |
| `packages/services/device-service/src/device-scheduler.ts` | Redis error catch |
| `packages/ui/src/graphics/hooks/usePixiTickerEffect.ts` | `g.destroyed` guard, `gRef` cleanup |
| `deployment/docker-compose.yml` | Resource limits, PG tuning, Redis config, healthcheck |
| `deployment/docker-compose.dev.yml` | PG tuning, Redis config |
