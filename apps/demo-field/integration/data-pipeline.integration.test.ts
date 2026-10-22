import { describe, it, expect, beforeAll } from "vitest";
import {
  FIELD_URL,
  CONTAINER_URL,
  assertHealthy,
  login,
  api,
  deviceRows,
  valueOf,
  sleep,
  normalizeStack,
} from "./helpers";

/**
 * Veri hattı entegrasyonu (v2/dev, GERÇEK veri) — device-service yazma
 * mekanizması (`TelemetryWriteFilter`: deadband + maxStaleMs TTL) → WRITE_TELEMETRY
 * → data-service → TimescaleDB. Timescale satırları **web-API** ile doğrulanır
 * (`GET /api/data/:deviceId/range` ve `/latest`) — `docker exec`/`psql`
 * bağımlılığı YOKTUR (stack hangi daemon'da olursa olsun HTTP yeterlidir).
 *
 * C1 dedup · C2 TTL üretimi · C3 latest pencere · C4 downsampled · C5 fire-and-forget · C6 satır bütünlüğü
 */

let fieldToken = "";
let containerToken = "";

/**
 * Bir cihaz/isim için son N saniyedeki RAW Timescale satır sayısı.
 * `/range` ham satır döndürür (deadband/TTL ile yazılan gerçek satırlar);
 * `limit` sayım için yeterince yüksektir.
 */
async function countRows(deviceId: string, name: string, seconds: number): Promise<number> {
  const to = new Date();
  const from = new Date(to.getTime() - seconds * 1000);
  const query =
    `/api/data/${deviceId}/range` +
    `?from=${encodeURIComponent(from.toISOString())}` +
    `&to=${encodeURIComponent(to.toISOString())}` +
    `&names=${encodeURIComponent(name)}&limit=1000`;
  const { status, body } = await api(CONTAINER_URL, containerToken, query);
  if (status !== 200) return 0;
  const telemetries = (body as { telemetries?: unknown[] }).telemetries ?? [];
  return telemetries.length;
}

async function waitFor(fn: () => Promise<boolean> | boolean, timeoutMs: number, intervalMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await sleep(intervalMs);
  }
  return false;
}

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  await normalizeStack(fieldToken, containerToken);
  // Yazma hattının oturması için kısa bekleme.
  await sleep(3000);
});

describe("C — yazma hattı (gerçek Timescale verisi)", () => {
  it("C1 dedup: sabit telemetri (BSC SOH) her poll'da yazılmaz (≤2 satır/30 sn)", async () => {
    expect(await countRows("BSC-1", "BSC SOH", 30)).toBeLessThanOrEqual(2);
  });

  it("C2 TTL: sabit BSC SOH maxStaleMs sonrası yine üretilir (≥2 satır/70 sn)", async () => {
    const ok = await waitFor(() => countRows("BSC-1", "BSC SOH", 70).then((n) => n >= 2), 100_000, 5_000);
    expect(ok).toBe(true);
  }, 120_000);

  it("C3 latest: sessiz sinyal unified/latest'ta döner", async () => {
    const rows = await deviceRows(CONTAINER_URL, containerToken, "BSC-1");
    expect(Number.isFinite(valueOf(rows, "BSC SOH"))).toBe(true);
  }, 40_000);

  it("C4 downsampled: 5 dk pencere zaman-kovası verisi döner", async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 5 * 60_000);
    const { status, body } = await api(
      FIELD_URL,
      fieldToken,
      `/api/unified/telemetry/downsampled?deviceIds=PCS-1&from=${from.toISOString()}&to=${to.toISOString()}&points=60`,
    );
    expect(status).toBe(200);
    const telemetries = (body as { telemetries?: unknown[] }).telemetries ?? [];
    expect(Array.isArray(telemetries)).toBe(true);
    expect(telemetries.length).toBeGreaterThan(0);
  }, 40_000);

  it("C5 fire-and-forget: komut yanıtı hızlı (P95 < 500 ms)", async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t0 = Date.now();
      const { status } = await api(FIELD_URL, fieldToken, "/api/commands/execute", {
        method: "POST",
        body: JSON.stringify({ deviceId: "PCS-1", command: "charge", params: { powerKw: 10 + i } }),
      });
      expect(status).toBe(200);
      latencies.push(Date.now() - t0);
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
    expect(p95).toBeLessThan(500);
  }, 60_000);

  it("C6 satır bütünlüğü: canonical tag + unit Timescale satırında", async () => {
    const { status, body } = await api(
      CONTAINER_URL,
      containerToken,
      `/api/data/BSC-1/latest?limit=1&name=${encodeURIComponent("BSC SOC")}`,
    );
    expect(status).toBe(200);
    const row = (
      (body as { telemetries?: Array<{ name: string; unit: string; tags?: Record<string, string> }> })
        .telemetries ?? []
    )[0];
    expect(row?.name).toBe("BSC SOC");
    expect(row?.unit).toBe("%");
    expect(row?.tags?.canonical).toBe("soc");
  });
});
