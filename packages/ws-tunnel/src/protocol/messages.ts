import { z } from "zod";
import type { TunnelRole, TunnelTelemetryPoint } from "../types";

/**
 * WS tüneli kontrol kanalı sözleşmesi — JENERİK (tasarım §4).
 *
 * İki frame sınıfı vardır: text frame'leri = kontrol mesajları (bu dosya),
 * binary frame'leri = tünel akış verisi (`../codec`).
 */

/**
 * WS kontrol kanalı protokol sürümü — `register.protocolVersion` alanında taşınır.
 * v2: register şeması nötr `peerId` + `peerType` taşır (v1: `containerId`).
 */
export const TUNNEL_PROTOCOL_VERSION = 2;

/**
 * Tünel uç noktası türü — aynı paketin iki farklı topolojide kullanımı:
 * - `container`: konteyner, field'a bağlanır (ilk deployment)
 * - `field`: field, boss'a bağlanır (uplink — ikinci deployment)
 */
export type TunnelPeerType = "container" | "field";

/** Bilinen peer türleri — `register.peerType` doğrulaması için. */
export const TUNNEL_PEER_TYPES: readonly TunnelPeerType[] = ["container", "field"];

/**
 * Peer bağlantı durumu — HUB tarafı görünümü.
 *
 * - `idle`: kayıtlı ama WS kapalı (son telemetri korunur, tasarım §12.4)
 * - `connected`: register tamam + heartbeat akıyor
 * - `stale`: heartbeat 45 sn sessiz (WS hâlâ açık olabilir — yarı ölü)
 * - `error`: WS hata bildirdi
 *
 * Transport `ConnectionState`'ından AYRIDIR — tünel/telemetri transportu
 * "stale" kavramını bilmez.
 */
export type PeerConnectionState = "idle" | "connected" | "stale" | "error";

/** Verilen değer geçerli bir PeerConnectionState mi? */
export function isPeerConnectionState(
  value: unknown,
): value is PeerConnectionState {
  return (
    value === "idle" ||
    value === "connected" ||
    value === "stale" ||
    value === "error"
  );
}

/**
 * TunnelConnector durum makinesi (client tarafı — tasarım §6 diyagramı):
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
export type TunnelConnectorState =
  | "offline"
  | "connecting"
  | "registered"
  | "connected"
  | "backoff";

/**
 * Operational config — hub'dan `register-ack.config` veya `config-update`
 * frame'iyle canlı push edilir; client restart'sız uygular (tasarım §6.1).
 *
 * ZORUNLU alan YOKTUR — gelen obje `DEFAULT_TUNNEL_OPERATIONAL_CONFIG` üzerine
 * merge edilir. Bilinmeyen anahtarlar strip edilir (ileri uyumluluk: ileride
 * session limitleri, path allowlist, RBAC eşlemesi, log seviyesi eklenebilir).
 */
export interface TunnelOperationalConfig {
  /** Heartbeat gönderim aralığı (ms). Bant: 1000-300000. Varsayılan: 15000. */
  heartbeatIntervalMs?: number;
  /** Telemetri snapshot push aralığı (ms). Bant: 1000-300000. Varsayılan: 15000. */
  telemetryIntervalMs?: number;
}

/** Operational config zod şeması — bilinmeyen anahtarlar strip edilir. */
export const tunnelOperationalConfigSchema = z.object({
  heartbeatIntervalMs: z.number().int().min(1000).max(300000).optional(),
  telemetryIntervalMs: z.number().int().min(1000).max(300000).optional(),
});

/** Varsayılan operational config — heartbeat 15 sn, telemetry 15 sn (tasarım §4.3). */
export const DEFAULT_TUNNEL_OPERATIONAL_CONFIG: Readonly<
  Required<TunnelOperationalConfig>
> = Object.freeze({
  heartbeatIntervalMs: 15000,
  telemetryIntervalMs: 15000,
});

/** Bilinen kontrol mesajı tipleri (§4.1 tablosu + telemetri sorgusu). */
export const TUNNEL_MESSAGE_TYPES = [
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
  "event",
  "error",
] as const;

/** Client→Hub: İlk mesaj — service token'lı upgrade sonrası gönderilir. */
export interface RegisterMessage {
  type: "register";
  /** Peer kimliği — v2 nötr ad (konteyner: containerId, field: fieldId). */
  peerId: string;
  /** Peer türü — hub kayıt/doğrulama tarafını seçer. */
  peerType: TunnelPeerType;
  /** Bilgi amaçlıdır — hub yalnızca registry'deki URL'i trust eder (SSRF). */
  peerUrl?: string;
  protocolVersion: number;
}

/** Hub→Client: Doğrulama sonucu + opsiyonel operational config. */
export interface RegisterAckMessage {
  type: "register-ack";
  status: "ok" | "rejected";
  serverTime: string;
  config?: TunnelOperationalConfig;
}

/** Hub→Client: Canlı operational config push — yeniden başlatma gerektirmez. */
export interface ConfigUpdateMessage {
  type: "config-update";
  config: TunnelOperationalConfig;
}

/** Client→Hub: 15 sn'de bir; `ts` = gönderen saati (ms epoch). */
export interface HeartbeatMessage {
  type: "heartbeat";
  ts: number;
}

/** Client→Hub: En güncel telemetri snapshot'ı. */
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
 * Client→Hub: jenerik olay bildirimi (alarm/audit aktarımı — Boss Faz 5).
 * Kaynak taraf (field/container) önemli geçiş olaylarını HUB'a push eder;
 * hub kopyası bilgilendirme amaçlıdır — tamper-evidence otoritesi KAYNAK
 * tarafının kendi log zincirinde kalır. `eventId` kaynakta benzersizdir ve
 * hub'da dedupe anahtarıdır (kopukluk backlog'unda çift gönderim güvenli).
 */
export interface EventMessage {
  type: "event";
  eventId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "app" | "security";
  eventCode: string;
  message: string;
  context?: Record<string, string>;
}

/**
 * Hub→Client: tarihsel (downsampled) telemetri serisi sorgusu — outbound-only model
 * (hub client'a HTTP açmaz; bkz. tasarım R4/R5). Yanıt `telemetry-result`
 * ile aynı kanaldan döner.
 *
 * `from`/`to` ISO-8601'dir (client tarafında zod ile doğrulanır).
 * `deviceIds`/`names` opsiyoneldir — verilmezse client çevrimiçi tüm
 * cihazlarını sorgular.
 */
export interface TelemetryQueryMessage {
  type: "telemetry-query";
  /** İstek-yanıt eşleştirme kimliği (hub tarafı üretir — benzersiz). */
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

/** Client→Hub: `telemetry-query` yanıtı — downsampled seri (boş olabilir). */
export interface TelemetryResultMessage {
  type: "telemetry-result";
  queryId: string;
  data: TunnelTelemetryPoint[];
}

/** Client→Hub: sorgu başarısız — hub boş seri gösterir (kademeli bozulma). */
export interface TelemetryQueryErrorMessage {
  type: "telemetry-query-error";
  queryId: string;
  message: string;
}

/** Telemetri sorgu mesajları — TunnelConnector kanalı üzerinden taşınır. */
export type TelemetryQueryControlMessage =
  | TelemetryQueryMessage
  | TelemetryResultMessage
  | TelemetryQueryErrorMessage;

/**
 * `telemetry-query` alım zod şeması — güvenilmez hub girdisi doğrulanır
 * (client tarafı; geçersiz sorgu `telemetry-query-error` ile reddedilir).
 */
export const telemetryQuerySchema = z.object({
  queryId: z.string().min(1).max(128),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  points: z.number().int().min(1).max(5000),
  deviceIds: z.array(z.string().min(1)).max(200).optional(),
  names: z.array(z.string().min(1)).max(500).optional(),
});

/** Hub→Client: oturum isteği — `user.role` hub tarafında EŞLENMİŞ client rolüdür (§5.5). */
export interface OpenSessionMessage {
  type: "open-session";
  sessionId: string;
  user: {
    id: string;
    username: string;
    role: TunnelRole;
  };
}

/** Client→Hub: kısa ömürlü client JWT'si (kendi secret'i — §5.4). */
export interface OpenSessionAckMessage {
  type: "open-session-ack";
  sessionId: string;
  token: string;
  expiresInSec: number;
}

/** Hub→Client: oturumu kapat (iptal / TTL / hub restart). */
export interface SessionEndMessage {
  type: "session-end";
  sessionId: string;
  reason: string;
}

/** Hub→Client: yeni HTTP/WS akışı — `upgrade:"websocket"` ise WS köprüsü. */
export interface StreamOpenMessage {
  type: "stream-open";
  streamId: number;
  sessionId: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  upgrade?: "websocket";
}

/** Client→Hub: yanıt başladı (HTTP durum kodu + başlıklar; WS için 101). */
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

/** Oturum + akış mesajları (tünel alt kümesi). */
export type SessionStreamMessage =
  | OpenSessionMessage
  | OpenSessionAckMessage
  | SessionEndMessage
  | StreamOpenMessage
  | StreamOpenAckMessage
  | StreamWindowMessage
  | StreamCloseMessage;

/** Kanal üzerindeki tüm kontrol mesajları. */
export type TunnelControlMessage =
  | RegisterMessage
  | RegisterAckMessage
  | ConfigUpdateMessage
  | HeartbeatMessage
  | TelemetryMessage
  | ErrorMessage
  | EventMessage
  | SessionStreamMessage
  | TelemetryQueryControlMessage;

/**
 * `GET /api/status` yanıt DTO'su (tasarım §6) — client UI "Hub Bağlantısı"
 * göstergesini besler. `lastHeartbeatAt` hiç gönderilmemişse undefined.
 */
export interface TunnelConnectionStatus {
  connected: boolean;
  state: TunnelConnectorState;
  lastHeartbeatAt?: string;
}
