import { describe, it, expect } from "vitest";
import { FrameCodec } from "./frame-codec";
import {
  FRAME_HEADER_SIZE,
  MAX_FRAME_PAYLOAD,
  FLAG_FIN,
  FLAG_RST,
  FLAG_WS_OP,
  WS_OPCODE,
} from "./types";
import type { TunnelFrame } from "./types";

/**
 * T3.1 — Tunnel frame codec sözleşmesi (tasarım §4.2):
 *
 * 9 bayt başlık: streamId (u32 BE) + seq (u32 BE) + flags (1 bayt).
 * flags: 0x01 FIN · 0x02 RST · 0x04 WS_OP; WS_OP varken yüksek 4 bit opcode
 * (0x0 veri, 0x1 text, 0x2 binary, 0x8 close, 0x9 ping, 0xA pong).
 *
 * - `encode(frame)` → Buffer(9 + payload). Programcı hatası (aralık dışı
 *   streamId/seq, WS_OP'siz opcode, >4 bit opcode) → ValidationError throw.
 * - `decode(buffer)` → `Result<TunnelFrame, FrameDecodeError>` — throw YOK;
 *   9 bayttan kısa girdi veya `maxPayload` aşımı → Err. Bozuk/rastgele girdi
 *   asla throw etmez (fuzz garantisi — güvenilmez WS girdisi).
 * - Round-trip: encode→decode orijinal frame'i geri verir (payload byte-birebir).
 * - WS_OP yokken opcode yoktur (undefined); bilinmeyen opcode değerleri taşınır
 *   (ileri uyumluluk).
 */

const payload = (n: number): Uint8Array =>
  Uint8Array.from({ length: n }, (_, i) => (i * 7 + 3) % 256);

describe("FrameCodec (T3.1) @nis2-security", () => {
  const codec = new FrameCodec();

  describe("encode()", () => {
    it("başlık + payload boyutu = 9 + payload.length", () => {
      const frame: TunnelFrame = {
        streamId: 1,
        seq: 0,
        flags: 0,
        payload: payload(16),
      };
      expect(codec.encode(frame).length).toBe(FRAME_HEADER_SIZE + 16);
    });

    it("streamId u32 BE olarak yazılır", () => {
      const buf = codec.encode({ streamId: 0x12345678, seq: 0, flags: 0, payload: new Uint8Array(0) });
      expect(buf[0]).toBe(0x12);
      expect(buf[1]).toBe(0x34);
      expect(buf[2]).toBe(0x56);
      expect(buf[3]).toBe(0x78);
    });

    it("seq u32 BE olarak yazılır (wrap değerleri dahil)", () => {
      const buf = codec.encode({ streamId: 0, seq: 0xffffffff, flags: 0, payload: new Uint8Array(0) });
      expect([buf[4], buf[5], buf[6], buf[7]]).toEqual([0xff, 0xff, 0xff, 0xff]);
    });

    it("flags baytı: FIN|RST|WS_OP birleşimi", () => {
      const flags = FLAG_FIN | FLAG_RST | FLAG_WS_OP;
      const buf = codec.encode({ streamId: 0, seq: 0, flags, opcode: WS_OPCODE.Binary, payload: new Uint8Array(0) });
      expect(buf[8]).toBe(flags | (WS_OPCODE.Binary << 4));
    });

    it("negatif streamId reddedilir", () => {
      expect(() =>
        codec.encode({ streamId: -1, seq: 0, flags: 0, payload: new Uint8Array(0) }),
      ).toThrow();
    });

    it("u32 üstü streamId/seq reddedilir", () => {
      expect(() =>
        codec.encode({ streamId: 2 ** 32, seq: 0, flags: 0, payload: new Uint8Array(0) }),
      ).toThrow();
      expect(() =>
        codec.encode({ streamId: 0, seq: 2 ** 32, flags: 0, payload: new Uint8Array(0) }),
      ).toThrow();
    });

    it("ondalıklı streamId reddedilir", () => {
      expect(() =>
        codec.encode({ streamId: 1.5, seq: 0, flags: 0, payload: new Uint8Array(0) }),
      ).toThrow();
    });

    it("WS_OP set iken opcode zorunludur", () => {
      expect(() =>
        codec.encode({ streamId: 0, seq: 0, flags: FLAG_WS_OP, payload: new Uint8Array(0) }),
      ).toThrow();
    });

    it("WS_OP yokken opcode verilemez", () => {
      expect(() =>
        codec.encode({ streamId: 0, seq: 0, flags: 0, opcode: WS_OPCODE.Text, payload: new Uint8Array(0) }),
      ).toThrow();
    });

    it("opcode 4 bit ile sınırlıdır", () => {
      expect(() =>
        codec.encode({ streamId: 0, seq: 0, flags: FLAG_WS_OP, opcode: 16, payload: new Uint8Array(0) }),
      ).toThrow();
    });
  });

  describe("decode()", () => {
    it("9 bayttan kısa girdi → Err (throw yok)", () => {
      for (let n = 0; n < FRAME_HEADER_SIZE; n++) {
        const result = codec.decode(new Uint8Array(n));
        expect(result.isErr()).toBe(true);
      }
    });

    it("boş payload'lı frame decode edilir", () => {
      const frame: TunnelFrame = { streamId: 7, seq: 3, flags: FLAG_FIN, payload: new Uint8Array(0) };
      const result = codec.decode(codec.encode(frame));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().streamId).toBe(7);
      expect(result.unwrap().seq).toBe(3);
      expect(result.unwrap().flags).toBe(FLAG_FIN);
      expect(result.unwrap().opcode).toBeUndefined();
      expect(result.unwrap().payload).toHaveLength(0);
    });

    it("WS_OP + opcode geri okunur", () => {
      const frame: TunnelFrame = {
        streamId: 1,
        seq: 2,
        flags: FLAG_WS_OP,
        opcode: WS_OPCODE.Text,
        payload: payload(10),
      };
      const result = codec.decode(codec.encode(frame));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().opcode).toBe(WS_OPCODE.Text);
      expect(result.unwrap().flags & FLAG_WS_OP).toBe(FLAG_WS_OP);
    });

    it("bilinmeyen opcode değeri taşınır (ileri uyumluluk)", () => {
      const frame: TunnelFrame = {
        streamId: 0,
        seq: 0,
        flags: FLAG_WS_OP,
        opcode: 0xf,
        payload: new Uint8Array(0),
      };
      const result = codec.decode(codec.encode(frame));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().opcode).toBe(0xf);
    });

    it("maxPayload aşımı → Err", () => {
      const big = codec.encode({
        streamId: 0,
        seq: 0,
        flags: 0,
        payload: payload(MAX_FRAME_PAYLOAD + 1),
      });
      expect(codec.decode(big).isErr()).toBe(true);
      expect(codec.decode(big, MAX_FRAME_PAYLOAD + 1).isOk()).toBe(true);
    });

    it("payload tam uzunlukta döner", () => {
      const data = payload(256);
      const buf = codec.encode({ streamId: 9, seq: 9, flags: FLAG_FIN, payload: data });
      const result = codec.decode(buf);
      expect(result.isOk()).toBe(true);
      expect(Buffer.from(result.unwrap().payload)).toEqual(Buffer.from(data));
    });
  });

  describe("round-trip (fuzz)", () => {
    it("rastgele 500 frame encode→decode eşitliği", () => {
      let seed = 42;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return seed;
      };
      for (let i = 0; i < 500; i++) {
        const length = rand() % 2000;
        const hasWsOp = rand() % 2 === 0;
        const frame: TunnelFrame = {
          streamId: rand() % 2 ** 32,
          seq: rand() % 2 ** 32,
          flags: hasWsOp ? FLAG_WS_OP : rand() % 8,
          ...(hasWsOp ? { opcode: rand() % 16 } : {}),
          payload: payload(length),
        };
        const result = codec.decode(codec.encode(frame));
        expect(result.isOk()).toBe(true);
        const back = result.unwrap();
        expect(back.streamId).toBe(frame.streamId);
        expect(back.seq).toBe(frame.seq);
        expect(back.flags & 0x0f).toBe(frame.flags & 0x0f);
        expect(back.opcode).toBe(frame.opcode);
        expect(Buffer.from(back.payload)).toEqual(Buffer.from(frame.payload));
      }
    });

    it("rastgele 1000 bayt akışı decode'da asla throw etmez", () => {
      let seed = 7;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return seed;
      };
      for (let i = 0; i < 1000; i++) {
        const length = rand() % 300;
        const buf = new Uint8Array(length);
        for (let j = 0; j < length; j++) buf[j] = rand() % 256;
        const result = codec.decode(buf);
        expect(result.isOk() || result.isErr()).toBe(true); // ikisinden biri, throw yok
      }
    });
  });
});
