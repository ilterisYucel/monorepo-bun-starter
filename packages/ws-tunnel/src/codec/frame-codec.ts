import { ValidationError, Result } from "@gd-monorepo/result";
import {
  FRAME_HEADER_SIZE,
  MAX_FRAME_PAYLOAD,
  FLAG_WS_OP,
} from "./types";
import type { TunnelFrame } from "./types";

/** Frame çözümleme hatası — beklenen (güvenilmez WS girdisi), Result ile taşınır. */
export class FrameDecodeError extends ValidationError {
  constructor(reason: string) {
    super("tunnel.frame-decode", reason);
  }
}

/**
 * FrameCodec — tünel binary frame codec'i (tasarım §4.2).
 *
 * - `encode(frame)`: programcı hatası (aralık dışı streamId/seq, hatalı
 *   opcode-flag birleşimi) throw eder — bunlar protokol verisi değildir.
 * - `decode(buffer, maxPayload?)`: girdi güvenilmezdir; HİÇBİR durumda throw
 *   etmez — kısa/çok-büyük frame `Result.err(FrameDecodeError)` döner.
 *   İkisi birden (throw ve Result) bilinçli hibrittir (bkz. Faz 0 ek 2).
 */
export class FrameCodec {
  /** Frame'i 9 bayt başlık + payload olarak serileştirir. */
  encode(frame: TunnelFrame): Buffer {
    validateStreamId(frame.streamId);
    validateSeq(frame.seq);
    const wsOp = (frame.flags & FLAG_WS_OP) === FLAG_WS_OP;
    if (wsOp) {
      if (frame.opcode === undefined) {
        throw new ValidationError(
          "tunnel.opcode-required",
          "WS_OP set iken opcode zorunludur",
        );
      }
      validateOpcode(frame.opcode);
    } else if (frame.opcode !== undefined) {
      throw new ValidationError(
        "tunnel.opcode-forbidden",
        "opcode yalnızca WS_OP flag'i ile taşınır",
      );
    }
    if (!(frame.flags >= 0 && frame.flags <= 0xff)) {
      throw new ValidationError("tunnel.bad-flags", "flags 0-255 araliginda olmali");
    }

    const header = Buffer.allocUnsafe(FRAME_HEADER_SIZE);
    header.writeUInt32BE(frame.streamId, 0);
    header.writeUInt32BE(frame.seq, 4);
    header[8] = (frame.flags & 0x0f) | ((frame.opcode ?? 0) << 4);
    return Buffer.concat([header, Buffer.from(frame.payload)]);
  }

  /**
   * Ham baytları frame'e çözer. Kısa girdi veya `maxPayload` aşımı → Err;
   * aksi halde Ok. WS_OP yokken `opcode` undefined döner; bilinmeyen opcode
   * değerleri korunur (ileri uyumluluk).
   */
  decode(buffer: Uint8Array, maxPayload: number = MAX_FRAME_PAYLOAD): Result<TunnelFrame, FrameDecodeError> {
    if (buffer.length < FRAME_HEADER_SIZE) {
      return Result.err(
        new FrameDecodeError(
          `frame cok kisa: ${buffer.length} bayt (min ${FRAME_HEADER_SIZE})`,
        ),
      );
    }
    const payloadLength = buffer.length - FRAME_HEADER_SIZE;
    if (payloadLength > maxPayload) {
      return Result.err(
        new FrameDecodeError(
          `payload cok buyuk: ${payloadLength} bayt (max ${maxPayload})`,
        ),
      );
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const streamId = view.getUint32(0);
    const seq = view.getUint32(4);
    const flags = view.getUint8(8) & 0x0f;
    const wsOp = (flags & FLAG_WS_OP) === FLAG_WS_OP;
    const opcode = wsOp ? view.getUint8(8) >> 4 : undefined;
    const payload = buffer.subarray(FRAME_HEADER_SIZE);
    return Result.ok({
      streamId,
      seq,
      flags,
      ...(opcode !== undefined ? { opcode } : {}),
      payload: Uint8Array.from(payload),
    });
  }
}

function validateStreamId(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new ValidationError(
      "tunnel.bad-stream-id",
      "streamId 0..2^32-1 araliginda tamsayi olmali",
      { context: { streamId: value } },
    );
  }
}

function validateSeq(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new ValidationError(
      "tunnel.bad-seq",
      "seq 0..2^32-1 araliginda tamsayi olmali",
      { context: { seq: value } },
    );
  }
}

function validateOpcode(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xf) {
    throw new ValidationError(
      "tunnel.bad-opcode",
      "opcode 4 bit ile sinirli (0-15)",
      { context: { opcode: value } },
    );
  }
}
