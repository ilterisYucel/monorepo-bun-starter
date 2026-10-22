import type { PathAllowlist } from "@gd-monorepo/ws-tunnel";

/** Hub-servis yapılandırması (env → config; fail-fast). */
export type HubAuthMode = "env" | "sqlite";

/** Kök-montaj hedefi — Host header'ı bir peer/servise eşlenir (A2 host-based). */
export interface HostMount {
  readonly peerId: string;
  readonly serviceId: string;
}

/** TLS yapılandırması — yoksa http (geriye dönük). */
export interface HubTlsConfig {
  /** BYO sertifika dosyaları (PEM). */
  readonly certPath?: string;
  readonly keyPath?: string;
  /** cert/key verilmezse açılışta self-signed üretilsin mi. */
  readonly selfSigned?: boolean;
  /** Üretilen sertifikanın host'u (CN + SAN). */
  readonly host?: string;
  /** Self-signed materyal dizini. */
  readonly dir?: string;
}

export interface HubConfig {
  readonly host: string;
  readonly port: number;
  /** env modunda zorunlu; sqlite modunda yok. */
  readonly peerToken?: string;
  readonly consumerToken: string;
  readonly authMode: HubAuthMode;
  /** sqlite modunda zorunlu; env modunda kullanılmaz. */
  readonly dbPath?: string;
  readonly cookieName: string;
  /** Peer uygulamasının beklediği oturum cookie adı (opak proxy'de eklenir). */
  readonly peerSessionCookie?: string;
  readonly hubId?: string;
  readonly staleTimeoutMs: number;
  readonly sweepIntervalMs: number;
  /** Tarayıcı oturumu mutlak ömrü (ms) — varsayılan 4 sa. */
  readonly sessionTtlMs: number;
  /** Tarayıcı oturumu boşta kalma süresi (ms) — varsayılan 15 dk. */
  readonly sessionIdleTimeoutMs: number;
  /** Tünel akışı boşta kalma süresi (ms) — varsayılan 5 dk. */
  readonly streamIdleTimeoutMs: number;
  readonly pathAllowlist: PathAllowlist;
  /**
   * Host header → (peer, servis) kök-montaj haritası (A2). Anahtar tam Host
   * (`app1.example` veya `127.0.0.1:5101`); eşleşen host'ta uygulama kökten
   * sunulur (mutlak path/XHR/WS doğal çalışır). Boşsa özellik kapalıdır.
   */
  readonly hostMap?: ReadonlyMap<string, HostMount>;
  /** TLS (BYO cert veya self-signed); tanımsızsa http. */
  readonly tls?: HubTlsConfig;
}

const DEFAULT_ALLOWED_PREFIXES = ["/", "/api/", "/ws/", "/assets/", "/favicon"];

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`[HubConfig] ${key} zorunlu`);
  }
  return value;
}

function intValue(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
): number {
  const raw = env[key];
  if (raw === undefined || raw.trim().length === 0) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[HubConfig] ${key} pozitif sayi olmali`);
  }
  return Math.trunc(value);
}

function listValue(value: string | undefined): string[] {
  if (value === undefined) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * `HUB_HOST_MAP` ayrıştırır: `host[:port]=peerId/serviceId` (virgülle).
 * Anahtarlar küçük harfe indirilir (Host header normalizasyonu).
 */
function parseHostMap(value: string | undefined): Map<string, HostMount> {
  const map = new Map<string, HostMount>();
  for (const entry of listValue(value)) {
    const [rawKey, rawMount] = entry.split("=");
    const key = rawKey?.trim().toLowerCase();
    const parts = (rawMount ?? "").split("/");
    if (
      !key ||
      parts.length !== 2 ||
      parts[0]!.trim().length === 0 ||
      parts[1]!.trim().length === 0
    ) {
      throw new Error(
        `[HubConfig] HUB_HOST_MAP gecersiz kayit '${entry}' (beklenen: host[:port]=peerId/serviceId)`,
      );
    }
    map.set(key, { peerId: parts[0]!.trim(), serviceId: parts[1]!.trim() });
  }
  return map;
}

/** Haritadaki `host:port` anahtarlarından ek dinlenecek portları çıkarır. */
export function hostMapPorts(hostMap: ReadonlyMap<string, HostMount>): number[] {
  const ports = new Set<number>();
  for (const key of hostMap.keys()) {
    const match = /:(\d+)$/.exec(key);
    if (match) ports.add(Number(match[1]));
  }
  return [...ports];
}

/** TLS env'ini yapılandırmaya çevirir; hiçbir TLS env'i yoksa undefined. */
function parseTls(env: NodeJS.ProcessEnv): HubTlsConfig | undefined {
  const certPath = env.HUB_TLS_CERT?.trim() || undefined;
  const keyPath = env.HUB_TLS_KEY?.trim() || undefined;
  const enabled = /^(1|true|yes|on)$/i.test(env.HUB_TLS_ENABLED?.trim() ?? "");
  if (!enabled && (certPath === undefined || keyPath === undefined)) {
    return undefined;
  }
  return {
    certPath,
    keyPath,
    selfSigned: certPath === undefined || keyPath === undefined,
    host: env.HUB_TLS_HOST?.trim() || "localhost",
    dir: env.HUB_TLS_DIR?.trim() || "/tmp/hub-tls",
  };
}


/**
 * Env'den hub yapılandırmasını yükler (fail-fast).
 *
 * Eksik/geçersiz zorunlu alan → açılış reddedilir (sessiz yanlış yapılandırma yok).
 */
export function loadHubConfig(env: NodeJS.ProcessEnv = process.env): HubConfig {
  const allowedExtras = listValue(env.HUB_ALLOWED_PREFIXES);
  const blocked = listValue(env.HUB_BLOCKED_PREFIXES);

  // Auth modu: PEER_TOKEN varsa env (dev/simple); yoksa sqlite + bootstrap (prod).
  const peerToken = env.PEER_TOKEN?.trim() ? env.PEER_TOKEN : undefined;
  const authMode: HubAuthMode = peerToken !== undefined ? "env" : "sqlite";
  const dbPath =
    authMode === "sqlite" ? required(env, "HUB_DB_PATH") : env.HUB_DB_PATH;

  return {
    host: env.HOST ?? "0.0.0.0",
    port: intValue(env, "PORT", 5003),
    peerToken,
    consumerToken: required(env, "CONSUMER_TOKEN"),
    authMode,
    dbPath,
    cookieName: env.HUB_COOKIE_NAME ?? "tunnel_session",
    peerSessionCookie: env.HUB_PEER_SESSION_COOKIE?.trim() || undefined,
    hubId: env.HUB_ID,
    staleTimeoutMs: intValue(env, "HUB_STALE_TIMEOUT_MS", 45_000),
    sweepIntervalMs: intValue(env, "HUB_SWEEP_INTERVAL_MS", 1_000),
    sessionTtlMs: intValue(env, "HUB_SESSION_TTL_MS", 4 * 60 * 60 * 1000),
    sessionIdleTimeoutMs: intValue(env, "HUB_SESSION_IDLE_MS", 15 * 60 * 1000),
    streamIdleTimeoutMs: intValue(env, "HUB_STREAM_IDLE_MS", 5 * 60 * 1000),
    pathAllowlist: {
      allowedPrefixes: [...DEFAULT_ALLOWED_PREFIXES, ...allowedExtras],
      blockedPrefixes: blocked,
    },
    hostMap: parseHostMap(env.HUB_HOST_MAP),
    tls: parseTls(env),
  };
}
