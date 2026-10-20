import { z } from "zod";
import type { TunnelRole } from "../types";

/**
 * WS tüneli kontrol kanalı sözleşmesi — JENERİK transport.
 *
 * İki frame sınıfı vardır: text frame'leri = kontrol mesajları (bu dosya),
 * binary frame'leri = tünel akış verisi (`../codec`).
 *
 * Paket YALNIZ transport + oturum + akış taşır. Telemetri, operasyon ve olay
 * mesajları pakette DEĞİLDİR; tüketici kendi modülünde (jenerik kontrol kanalı
 * üzerinden) tanımlar — wire şekilleri değişmez.
 */

/**
 * WS kontrol kanalı protokol sürümü — `register.protocolVersion` alanında taşınır.
 * v2: register şeması nötr `peerId` + `peerType` taşır (v1: `containerId`).
 */
export const TUNNEL_PROTOCOL_VERSION = 2;

/**
 * Tünel uç noktası türü — WIRE değerleri (v2 sözleşmesi).
 * `container`/`field` mevcut deployment rollerinin wire adlarıdır; `device`
 * jenerik peer'dır. Anlam `services[]` ve tüketici config'iyle gelir.
 */
export type TunnelPeerType = "container" | "field" | "device";

/** Bilinen peer türleri — `register.peerType` doğrulaması için. */
export const TUNNEL_PEER_TYPES: readonly TunnelPeerType[] = [
  "container",
  "field",
  "device",
];

/**
 * Peer bağlantı durumu — HUB tarafı görünümü.
 *
 * - `idle`: kayıtlı ama WS kapalı
 * - `connected`: register tamam + heartbeat akıyor
 * - `stale`: heartbeat 45 sn sessiz (WS hâlâ açık olabilir — yarı ölü)
 * - `error`: WS hata bildirdi
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
 * TunnelConnector durum makinesi (client tarafı):
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
 * frame'iyle canlı push edilir; client restart'sız uygular.
 *
 * ZORUNLU alan YOKTUR — gelen obje `DEFAULT_TUNNEL_OPERATIONAL_CONFIG` üzerine
 * merge edilir. Bilinmeyen anahtarlar strip edilir (ileri uyumluluk).
 */
export interface TunnelOperationalConfig {
  /** Heartbeat gönderim aralığı (ms). Bant: 1000-300000. Varsayılan: 15000. */
  heartbeatIntervalMs?: number;
}

/** Operational config zod şeması — bilinmeyen anahtarlar strip edilir. */
export const tunnelOperationalConfigSchema = z.object({
  heartbeatIntervalMs: z.number().int().min(1000).max(300000).optional(),
});

/** Varsayılan operational config — heartbeat 15 sn. */
export const DEFAULT_TUNNEL_OPERATIONAL_CONFIG: Readonly<
  Required<TunnelOperationalConfig>
> = Object.freeze({
  heartbeatIntervalMs: 15000,
});

/** Bilinen kontrol mesajı tipleri — paket yalnız transport/oturum/akış taşır. */
export const TUNNEL_MESSAGE_TYPES = [
  "register",
  "register-ack",
  "config-update",
  "heartbeat",
  "open-session",
  "open-session-ack",
  "session-end",
  "stream-open",
  "stream-open-ack",
  "stream-window",
  "stream-close",
  "error",
] as const;

/** Client→Hub: İlk mesaj — service token'lı upgrade sonrası gönderilir. */
export interface RegisterMessage {
  type: "register";
  /** Peer kimliği — v2 nötr ad. */
  peerId: string;
  /** Peer türü — hub kayıt/doğrulama tarafını seçer. */
  peerType: TunnelPeerType;
  /** Bilgi amaçlıdır — hub yalnızca registry'deki URL'i trust eder (SSRF). */
  peerUrl?: string;
  /**
   * Peer'ın sunduğu OPAK servisler (opsiyonel). Hub yalnızca `id`+`meta`
   * bilir; hedef adres/protokol/endpoint BİLMEZ (opaklık ilkesi).
   */
  services?: ServiceAnnouncement[];
  protocolVersion: number;
}

/**
 * Peer servis duyurusu — OPAK.
 *
 * Yalnızca isim + kozmetik meta taşır. Hedef adres / protokol / health /
 * endpoint alanı **YOKTUR ve eklenemez**: hub servisin içini bilmez; hedef
 * peer'ın lokal config'inde kalır (SSRF ilkesi).
 */
export interface ServiceAnnouncement {
  /** Servis kimliği — peer içinde benzersiz, boş olamaz. */
  id: string;
  /** Kozmetik meta (dashboard) — davranışsal anlam taşımaz. */
  meta?: {
    title?: string;
    icon?: string;
  };
}

/**
 * Servis duyurusu zod şeması — STRICT: bilinmeyen alan RED (opaklık sınırı).
 */
export const serviceAnnouncementSchema = z
  .object({
    id: z.string().min(1).max(128),
    meta: z
      .object({
        title: z.string().min(1).max(256).optional(),
        icon: z.string().min(1).max(256).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

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

/** Her iki yön: protokol hatası (kod + insan-okunur mesaj). */
export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

/** Hub→Client: oturum isteği — `user.role` hub tarafında EŞLENMİŞ client rolüdür. */
export interface OpenSessionMessage {
  type: "open-session";
  sessionId: string;
  user: {
    id: string;
    username: string;
    role: TunnelRole;
  };
}

/** Client→Hub: kısa ömürlü client JWT'si (kendi secret'i). */
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

/** Her iki yön: akış kredisi (backpressure — pencere 256 KiB). */
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

/**
 * Kanal üzerindeki paket kontrol mesajları. Tüketici domain mesajları
 * (telemetri/operasyon/olay) burada DEĞİLDİR; bilinmeyen tipler abonelere akar.
 */
export type TunnelControlMessage =
  | RegisterMessage
  | RegisterAckMessage
  | ConfigUpdateMessage
  | HeartbeatMessage
  | ErrorMessage
  | SessionStreamMessage;

/**
 * Hub bağlantı durumu — client UI göstergesini besler.
 * `lastHeartbeatAt` hiç gönderilmemişse undefined.
 */
export interface TunnelConnectionStatus {
  connected: boolean;
  state: TunnelConnectorState;
  lastHeartbeatAt?: string;
}
