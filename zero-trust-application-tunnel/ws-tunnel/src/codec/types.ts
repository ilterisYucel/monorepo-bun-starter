/**
 * Tünel akış frame'i tipleri — tasarım §4.2.
 *
 * Binary frame düzeni (9 bayt başlık + payload):
 * ```
 *  0        4        8   9
 * ┌────────┬────────┬───┬────────────────────────┐
 * │ streamId (u32 BE) │ seq (u32 BE) │flags│ payload (ham bayt)
 * └────────┴────────┴───┴────────────────────────┘
 *   flags: 0x01 FIN · 0x02 RST · 0x04 WS_OP
 *   WS_OP varken sonraki 4 bit opcode: 0x0 veri, 0x1 text, 0x2 binary,
 *                                      0x8 close, 0x9 ping, 0xA pong
 * ```
 *
 * - `streamId`: oturum açan taraf (field) atar, monoton artan.
 * - `seq`: akış içi sıra (güvenilir WS üzerinde kayıp olmaz; teşhis amaçlı).
 * - `WS_OP`: tünel WS akışlarında mesaj sınırları ve opcode'lar korunur.
 */

/** Başlık boyutu: streamId (4) + seq (4) + flags (1). */
export const FRAME_HEADER_SIZE = 9;

/** Frame başına azami payload — 64 KiB parçalar (tasarım §5.2). */
export const MAX_CHUNK_SIZE = 64 * 1024;

/** decode() güvenlik sınırı — 1 MiB üstü frame reddedilir. */
export const MAX_FRAME_PAYLOAD = 1024 * 1024;

/** flags bitleri. */
export const FLAG_FIN = 0x01;
export const FLAG_RST = 0x02;
export const FLAG_WS_OP = 0x04;

/** WS_OP varken taşınan WS opcode değerleri (RFC 6455 alt kümesi). */
export const WS_OPCODE = {
  Data: 0x0,
  Text: 0x1,
  Binary: 0x2,
  Close: 0x8,
  Ping: 0x9,
  Pong: 0xa,
} as const;

/** Bir tünel akış frame'i. `opcode` yalnızca WS_OP flag'i set iken anlamlıdır. */
export interface TunnelFrame {
  /** Akış kimliği — 0..2^32-1. */
  streamId: number;
  /** Akış içi sıra numarası — 0..2^32-1. */
  seq: number;
  /** FIN|RST|WS_OP bitlerinin birleşimi (WS_OP varken yüksek 4 bit opcode taşır). */
  flags: number;
  /** WS_OP set iken WS opcode (0-15); diğer durumda undefined. */
  opcode?: number;
  /** Ham payload baytları. */
  payload: Uint8Array;
}
