import { Result } from "@gd-monorepo/ws-tunnel";
import type { TunnelPeerType } from "@gd-monorepo/ws-tunnel";

/** Agent yapılandırması — env-file veya environment'tan üretilir. */
export interface AgentConfig {
  readonly hubUrl: string;
  readonly peerId: string;
  readonly serviceId: string;
  readonly localTarget: string;
  /** Env modu: paylaşımlı peer token. */
  readonly peerToken?: string;
  /** Bootstrap modu: tek kullanımlık claim token'ı. */
  readonly bootstrapToken?: string;
  /** Claim sonrası kalıcı secret (tek kullanımlık bootstrap'ın yerine geçer). */
  readonly peerSecret?: string;
  readonly peerType: TunnelPeerType;
  readonly tlsInsecure: boolean;
  /** Oturum JWT imza secret'ı (yoksa çalışma anında üretilir). */
  readonly hubSecret?: string;
  readonly heartbeatIntervalMs: number;
  readonly livenessTimeoutMs: number;
}

export interface ConfigError {
  readonly field: string;
  readonly message: string;
}

export type ConfigEnv = Record<string, string | undefined>;

const SECRET_KEYS = new Set(["PEER_TOKEN", "PEER_SECRET", "BOOTSTRAP_TOKEN", "HUB_SECRET"]);

const PEER_TYPES: readonly TunnelPeerType[] = ["device", "field", "container"];

const DEFAULTS = {
  peerType: "device" as TunnelPeerType,
  heartbeatIntervalMs: 1000,
  livenessTimeoutMs: 60_000,
} as const;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function positiveInt(
  env: ConfigEnv,
  key: string,
  fallback: number,
  errors: ConfigError[],
): number {
  const raw = env[key];
  if (raw === undefined || raw.trim().length === 0) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    errors.push({ field: key, message: `${key} pozitif tamsayi olmali` });
    return fallback;
  }
  return value;
}

function truthy(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

/**
 * Env/environment kaydını doğrulanmış `AgentConfig`e çevirir (sorgu — saf).
 * Zorunlu: HUB_URL, SERVICE_ID, LOCAL_TARGET + kimlik (PEER_TOKEN ∨
 * BOOTSTRAP_TOKEN ∨ PEER_SECRET). PEER_ID yoksa hostname kullanılır.
 */
export function parseAgentConfig(
  env: ConfigEnv,
  options: { hostname?: string } = {},
): Result<AgentConfig, ConfigError[]> {
  const errors: ConfigError[] = [];
  const hubUrl = env.HUB_URL?.trim() ?? "";
  const serviceId = env.SERVICE_ID?.trim() ?? "";
  const localTarget = env.LOCAL_TARGET?.trim() ?? "";
  const peerId = env.PEER_ID?.trim() || options.hostname || "agent";

  if (hubUrl.length === 0) {
    errors.push({ field: "HUB_URL", message: "HUB_URL zorunlu" });
  } else if (!isHttpUrl(hubUrl)) {
    errors.push({ field: "HUB_URL", message: "HUB_URL http(s) olmali" });
  }
  if (serviceId.length === 0) {
    errors.push({ field: "SERVICE_ID", message: "SERVICE_ID zorunlu" });
  }
  if (localTarget.length === 0) {
    errors.push({ field: "LOCAL_TARGET", message: "LOCAL_TARGET zorunlu" });
  } else if (!isHttpUrl(localTarget)) {
    errors.push({ field: "LOCAL_TARGET", message: "LOCAL_TARGET http(s) olmali" });
  }

  const peerToken = env.PEER_TOKEN?.trim() || undefined;
  const bootstrapToken = env.BOOTSTRAP_TOKEN?.trim() || undefined;
  const peerSecret = env.PEER_SECRET?.trim() || undefined;
  if (peerToken === undefined && bootstrapToken === undefined && peerSecret === undefined) {
    errors.push({
      field: "IDENTITY",
      message: "PEER_TOKEN, BOOTSTRAP_TOKEN veya PEER_SECRET zorunlu",
    });
  }

  const heartbeatIntervalMs = positiveInt(
    env,
    "HEARTBEAT_INTERVAL_MS",
    DEFAULTS.heartbeatIntervalMs,
    errors,
  );
  const livenessTimeoutMs = positiveInt(
    env,
    "LIVENESS_TIMEOUT_MS",
    DEFAULTS.livenessTimeoutMs,
    errors,
  );

  const rawPeerType = env.PEER_TYPE?.trim() || DEFAULTS.peerType;
  if (!PEER_TYPES.includes(rawPeerType as TunnelPeerType)) {
    errors.push({
      field: "PEER_TYPE",
      message: "PEER_TYPE device|field|container olmali",
    });
  }

  if (errors.length > 0) return Result.err(errors);

  return Result.ok({
    hubUrl,
    peerId,
    serviceId,
    localTarget,
    ...(peerToken !== undefined ? { peerToken } : {}),
    ...(bootstrapToken !== undefined ? { bootstrapToken } : {}),
    ...(peerSecret !== undefined ? { peerSecret } : {}),
    peerType: rawPeerType as TunnelPeerType,
    // TLS bypass yalnız https hedefte anlamlıdır.
    tlsInsecure: truthy(env.TLS_INSECURE) && localTarget.startsWith("https://"),
    ...(env.HUB_SECRET?.trim() ? { hubSecret: env.HUB_SECRET.trim() } : {}),
    heartbeatIntervalMs,
    livenessTimeoutMs,
  });
}

/** Env-file içeriğini kayda çevirir (sorgu — saf). */
export function readEnvFile(text: string): ConfigEnv {
  const env: ConfigEnv = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/**
 * Dosya env'i ile process env'ini birleştirir (sorgu — saf): env üzerine
 * yazar, ancak **secret'lar dosyada varsa korunur** (bootstrap claim sonrası
 * kalıcı secret, sonraki başlatmalarda env'deki tek kullanımlık token'ı ezer).
 */
export function mergeConfigEnv(fileEnv: ConfigEnv, env: ConfigEnv): ConfigEnv {
  const merged: ConfigEnv = { ...fileEnv };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value.trim().length === 0) continue;
    if (SECRET_KEYS.has(key) && (fileEnv[key]?.trim().length ?? 0) > 0) continue;
    merged[key] = value;
  }
  return merged;
}

function configLines(config: AgentConfig): Array<[string, string]> {
  const lines: Array<[string, string]> = [
    ["HUB_URL", config.hubUrl],
    ["PEER_ID", config.peerId],
    ["SERVICE_ID", config.serviceId],
    ["LOCAL_TARGET", config.localTarget],
    ["PEER_TYPE", config.peerType],
    ["TLS_INSECURE", config.tlsInsecure ? "1" : "0"],
    ["HEARTBEAT_INTERVAL_MS", String(config.heartbeatIntervalMs)],
    ["LIVENESS_TIMEOUT_MS", String(config.livenessTimeoutMs)],
  ];
  if (config.peerToken !== undefined) lines.push(["PEER_TOKEN", config.peerToken]);
  if (config.bootstrapToken !== undefined)
    lines.push(["BOOTSTRAP_TOKEN", config.bootstrapToken]);
  if (config.peerSecret !== undefined) lines.push(["PEER_SECRET", config.peerSecret]);
  if (config.hubSecret !== undefined) lines.push(["HUB_SECRET", config.hubSecret]);
  return lines;
}

/** Config'i env-file metnine çevirir (sorgu — saf). */
export function serializeAgentConfig(config: AgentConfig): string {
  return configLines(config)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")
    .concat("\n");
}

/** Secret'ları maskeleyerek gösterim üretir (sorgu — saf). */
export function maskConfig(config: AgentConfig): string {
  return configLines(config)
    .map(([key, value]) => `${key}=${SECRET_KEYS.has(key) ? "***" : value}`)
    .join("\n")
    .concat("\n");
}
