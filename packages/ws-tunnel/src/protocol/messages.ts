import { z } from "zod";
import type { TunnelRole, TunnelTelemetryPoint } from "../types";

/**
 * WS tüneli kontrol kanalı sözleşmesi — JENERİK (tasarım §4).
 *
 * İki frame sınıfı vardır: text frame'leri = kontrol mesajları (bu dosya),
 * binary frame'leri = tünel akış verisi (`../codec`).
 */

/** WS kontrol kanalı protokol sürümü — `register.protocolVersion` alanında taşınır. */
export const FIELD_PROTOCOL_VERSION = 1;

/**
 * Konteyner bağlantı durumu — FIELD tarafı görünümü.
 *
 * - `idle`: kayıtlı ama WS kapalı (son telemetri korunur, tasarım §12.4)
 * - `connected`: register tamam + heartbeat akıyor
 * - `stale`: heartbeat 45 sn sessiz (WS hâlâ açık olabilir — yarı ölü)
 * - `error`: WS hata bildirdi
 *
 * Transport `ConnectionState`'ından AYRIDIR — tünel/telemetri transportu
 * "stale" kavramını bilmez.
 */
export type ContainerConnectionState = "idle" | "connected" | "stale" | "error";

/** Verilen değer geçerli bir ContainerConnectionState mi? */
export function isContainerConnectionState(
  value: unknown,
): value is ContainerConnectionState {
  return (
    value === "idle" ||
    value === "connected" ||
    value === "stale" ||
    value === "error"
  );
}

/**
 * FieldConnector durum makinesi (konteyner tarafı — tasarım §6 diyagramı):
 *
 * ```
 * [*] --> offline
 * offline --> connecting: start() veya backoff bitti
 * connecting --> registered: register-ack ok
 * connecting --> backoff: hata/401/timeout
 * registered --> connected: ilk heartbeat gönderildi
 * connected --> backoff: WS kapandı / heartbeat timeout
 * backoff --> connecting: exp(2^n·1s)+jitter, max 60s
 * connected --> [*]: stop()
 * ```
 */
export type FieldConnectorState =
  | "offline"
  | "connecting"
  | "registered"
  | "connected"
  | "backoff";

/**
 * Operational config — field'dan `register-ack.config` veya `config-update`
 * frame'iyle canlı push edilir; konteyner restart'sız uygular (tasarım §6.1).
 *
 * ZORUNLU alan YOKTUR — gelen obje `DEFAULT_FIELD_OPERATIONAL_CONFIG` üzerine
 * merge edilir. Bilinmeyen anahtarlar strip edilir (ileri uyumluluk: ileride
 * session limitleri, path allowlist, RBAC eşlemesi, log seviyesi eklenebilir).
 */
export interface FieldOperationalConfig {
  /** Heartbeat gönderim aralığı (ms). Bant: 1000-300000. Varsayılan: 15000. */
  heartbeatIntervalMs?: number;
  /** Telemetri snapshot push aralığı (ms). Bant: 1000-300000. Varsayılan: 15000. */
  telemetryIntervalMs?: number;
}

/** Operational config zod şeması — bilinmeyen anahtarlar strip edilir. */
export const fieldOperationalConfigSchema = z.object({
  heartbeatIntervalMs: z.number().int().min(1000).max(300000).optional(),
  telemetryIntervalMs: z.number().int().min(1000).max(300000).optional(),
});

/** Varsayılan operational config — heartbeat 15 sn, telemetry 15 sn (tasarım §4.3). */
export const DEFAULT_FIELD_OPERATIONAL_CONFIG: Readonly<Required<FieldOperationalConfig>> =
  Object.freeze({
    heartbeatIntervalMs: 15000,
    telemetryIntervalMs: 15000,
  });

/** Bilinen kontrol mesajı tipleri (§4.1 tablosu + telemetri sorgusu). */
export const FIELD_MESSAGE_TYPES = [
  "register",
  "register-ack",
  "config-update",
  "heartbeat",
  "telemetry",
  "open-session",
  "open-session-ack",
  "session-end",
  "stream-open",
  "stream-open-ack",
  "stream-window",
  "stream-close",
  "telemetry-query",
  "telemetry-result",
  "telemetry-query-error",
  "error",
] as const;

/** C→F: İlk mesaj — service token'lı upgrade sonrası gönderilir. */
export interface RegisterMessage {
  type: "register";
  containerId: string;
  /** Bilgi amaçlıdır — field yalnızca registry'deki URL'i trust eder (SSRF). */
  containerUrl?: string;
  protocolVersion: number;
}

/** F→C: Doğrulama sonucu + opsiyonel operational config. */
export interface RegisterAckMessage {
  type: "register-ack";
  status: "ok" | "rejected";
  serverTime: string;
  config?: FieldOperationalConfig;
}

/** F→C: Canlı operational config push — yeniden başlatma gerektirmez. */
export interface ConfigUpdateMessage {
  type: "config-update";
  config: FieldOperationalConfig;
}

/** C→F: 15 sn'de bir; `ts` = gönderen saati (ms epoch). */
export interface HeartbeatMessage {
  type: "heartbeat";
  ts: number;
}

/** C→F: En güncel telemetri snapshot'ı. */
export interface TelemetryMessage {
  type: "telemetry";
  data: TunnelTelemetryPoint[];
}

/** Her iki yön: protokol hatası (kod + insan-okunur mesaj). */
export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

/**
 * F→C: tarihsel (downsampled) telemetri serisi sorgusu — outbound-only model
 * (field konteynere HTTP açmaz; bkz. tasarım R4/R5). Yanıt `telemetry-result`
 * ile aynı kanaldan döner.
 *
 * `from`/`to` ISO-8601'dir (konteyner tarafında zod ile doğrulanır).
 * `deviceIds`/`names` opsiyoneldir — verilmezse konteyner çevrimiçi tüm
 * cihazlarını sorgular.
 */
export interface TelemetryQueryMessage {
  type: "telemetry-query";
  /** İstek-yanıt eşleştirme kimliği (field tarafı üretir — benzersiz). */
  queryId: string;
  /** Sorgu başlangıcı (ISO-8601). */
  from: string;
  /** Sorgu bitişi (ISO-8601). */
  to: string;
  /** Hedef nokta sayısı (downsampling). Bant: 1-5000. */
  points: number;
  /** Opsiyonel cihaz filtresi — yoksa çevrimiçi tüm cihazlar. */
  deviceIds?: string[];
  /** Opsiyonel telemetri adı filtresi. */
  names?: string[];
}

/** C→F: `telemetry-query` yanıtı — downsampled seri (boş olabilir). */
export interface TelemetryResultMessage {
  type: "telemetry-result";
  queryId: string;
  data: TunnelTelemetryPoint[];
}

/** C→F: sorgu başarısız — field boş seri gösterir (kademeli bozulma). */
export interface TelemetryQueryErrorMessage {
  type: "telemetry-query-error";
  queryId: string;
  message: string;
}

/** Telemetri sorgu mesajları — FieldConnector kanalı üzerinden taşınır. */
export type TelemetryQueryControlMessage =
  | TelemetryQueryMessage
  | TelemetryResultMessage
  | TelemetryQueryErrorMessage;

/**
 * `telemetry-query` alım zod şeması — güvenilmez field girdisi doğrulanır
 * (konteyner tarafı; geçersiz sorgu `telemetry-query-error` ile reddedilir).
 */
export const telemetryQuerySchema = z.object({
  queryId: z.string().min(1).max(128),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  points: z.number().int().min(1).max(5000),
  deviceIds: z.array(z.string().min(1)).max(200).optional(),
  names: z.array(z.string().min(1)).max(500).optional(),
});

/** F→C: oturum isteği — `user.role` field tarafında EŞLENMİŞ konteyner rolüdür (§5.5). */
export interface OpenSessionMessage {
  type: "open-session";
  sessionId: string;
  user: {
    id: string;
    username: string;
    role: TunnelRole;
  };
}

/** C→F: kısa ömürlü konteyner JWT'si (kendi secret'i — §5.4). */
export interface OpenSessionAckMessage {
  type: "open-session-ack";
  sessionId: string;
  token: string;
  expiresInSec: number;
}

/** F→C: oturumu kapat (iptal / TTL / field restart). */
export interface SessionEndMessage {
  type: "session-end";
  sessionId: string;
  reason: string;
}

/** F→C: yeni HTTP/WS akışı — `upgrade:"websocket"` ise WS köprüsü. */
export interface StreamOpenMessage {
  type: "stream-open";
  streamId: number;
  sessionId: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  upgrade?: "websocket";
}

/** C→F: yanıt başladı (HTTP durum kodu + başlıklar; WS için 101). */
export interface StreamOpenAckMessage {
  type: "stream-open-ack";
  streamId: number;
  statusCode: number;
  headers?: Record<string, string>;
}

/** Her iki yön: akış kredisi (backpressure — §5.2, pencere 256 KiB). */
export interface StreamWindowMessage {
  type: "stream-window";
  streamId: number;
  credit: number;
}

/** Her iki yön: akış sonu. */
export interface StreamCloseMessage {
  type: "stream-close";
  streamId: number;
  reason: string;
}

/** Tünel kontrol mesajları (kayıt/telemetri mesajlarıyla birlikte kanal sözleşmesi). */
export type TunnelControlMessage =
  | OpenSessionMessage
  | OpenSessionAckMessage
  | SessionEndMessage
  | StreamOpenMessage
  | StreamOpenAckMessage
  | StreamWindowMessage
  | StreamCloseMessage;

/** Kanal üzerindeki tüm kontrol mesajları. */
export type FieldControlMessage =
  | RegisterMessage
  | RegisterAckMessage
  | ConfigUpdateMessage
  | HeartbeatMessage
  | TelemetryMessage
  | ErrorMessage
  | TunnelControlMessage
  | TelemetryQueryControlMessage;

/**
 * `GET /api/status` yanıt DTO'su (tasarım §6) — container UI "Field Bağlantısı"
 * göstergesini besler. `lastHeartbeatAt` hiç gönderilmemişse undefined.
 */
export interface FieldConnectionStatus {
  fieldConnected: boolean;
  state: FieldConnectorState;
  lastHeartbeatAt?: string;
}
