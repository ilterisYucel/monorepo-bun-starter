// Frame codec (tasarım §4.2/§5) — jenerik; her iki uç (field + container) paylaşır.

export { FrameCodec, FrameDecodeError } from "./frame-codec";
export {
  FRAME_HEADER_SIZE,
  MAX_CHUNK_SIZE,
  MAX_FRAME_PAYLOAD,
  FLAG_FIN,
  FLAG_RST,
  FLAG_WS_OP,
  WS_OPCODE,
} from "./types";
export type { TunnelFrame } from "./types";
