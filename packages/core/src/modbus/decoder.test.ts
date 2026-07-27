import { describe, it, expect } from "vitest";
import { BinaryPayloadDecoder } from "./decoder";
import type { ByteOrder, RegisterDataType } from "@gd-monorepo/shared-types";

describe("BinaryPayloadDecoder", () => {
  describe("constructor + byte order", () => {
    it("stores registers in BIG_ENDIAN order (no transform)", () => {
      const d = new BinaryPayloadDecoder([0x0123, 0x4567], "BIG_ENDIAN");
      expect(d.decodeUint16()).toBe(0x0123);
      expect(d.decodeUint16()).toBe(0x4567);
    });

    it("reverses bytes for LITTLE_ENDIAN", () => {
      const d = new BinaryPayloadDecoder([0x0100, 0x0000], "LITTLE_ENDIAN");
      // Registers [0x0100, 0x0000] → bytes [0x01, 0x00, 0x00, 0x00]
      // LITTLE_ENDIAN reverse → [0x00, 0x00, 0x00, 0x01]
      // decodeUint32 reads 0x00000001 = 1
      expect(d.decodeUint32()).toBe(1);
    });

    it("swaps words for BIG_ENDIAN_SWAP", () => {
      const d = new BinaryPayloadDecoder([0x0001, 0x0002], "BIG_ENDIAN_SWAP");
      // Registers [0x0001, 0x0002] → bytes [0x00, 0x01, 0x00, 0x02]
      // BIG_ENDIAN_SWAP: swap two 2-byte words → [0x00, 0x02, 0x00, 0x01]
      // decodeUint32 reads 0x00020001
      expect(d.decodeUint32()).toBe(0x00020001);
    });

    it("does 4-byte reverse for LITTLE_ENDIAN_SWAP", () => {
      const d = new BinaryPayloadDecoder([0x0102, 0x0304], "LITTLE_ENDIAN_SWAP");
      // Registers → bytes [0x01, 0x02, 0x03, 0x04]
      // LITTLE_ENDIAN_SWAP: [b0,b1,b2,b3] → [b2,b3,b0,b1] = [0x03, 0x04, 0x01, 0x02]
      // decodeUint32 reads 0x03040102
      expect(d.decodeUint32()).toBe(0x03040102);
    });
  });

  describe("decodeUint16", () => {
    it("decodes single unsigned 16-bit", () => {
      const d = new BinaryPayloadDecoder([42], "BIG_ENDIAN");
      expect(d.decodeUint16()).toBe(42);
    });

    it("decodes 0xFFFF as 65535", () => {
      const d = new BinaryPayloadDecoder([0xFFFF], "BIG_ENDIAN");
      expect(d.decodeUint16()).toBe(65535);
    });
  });

  describe("decodeInt16", () => {
    it("decodes positive value", () => {
      const d = new BinaryPayloadDecoder([100], "BIG_ENDIAN");
      expect(d.decodeInt16()).toBe(100);
    });

    it("decodes negative value (two's complement)", () => {
      const d = new BinaryPayloadDecoder([0xFFFF], "BIG_ENDIAN");
      expect(d.decodeInt16()).toBe(-1);
    });
  });

  describe("decodeUint32", () => {
    it("decodes two registers into 32-bit unsigned", () => {
      const d = new BinaryPayloadDecoder([0x0001, 0x0000], "BIG_ENDIAN");
      expect(d.decodeUint32()).toBe(65536);
    });

    it("decodes max value", () => {
      const d = new BinaryPayloadDecoder([0xFFFF, 0xFFFF], "BIG_ENDIAN");
      expect(d.decodeUint32()).toBe(0xFFFFFFFF);
    });
  });

  describe("decodeInt32", () => {
    it("decodes positive 32-bit", () => {
      const d = new BinaryPayloadDecoder([0x0000, 0x0064], "BIG_ENDIAN");
      expect(d.decodeInt32()).toBe(100);
    });

    it("decodes negative 32-bit", () => {
      const d = new BinaryPayloadDecoder([0xFFFF, 0xFFFF], "BIG_ENDIAN");
      expect(d.decodeInt32()).toBe(-1);
    });
  });

  describe("decodeFloat32", () => {
    it("decodes float 32 from two registers", () => {
      // 230.5 as float32 = 0x43668000
      // As two UINT16 registers: high=0x4366, low=0x8000
      const d = new BinaryPayloadDecoder([0x4366, 0x8000], "BIG_ENDIAN");
      const result = d.decodeFloat32();
      expect(result).toBeCloseTo(230.5, 1);
    });

    it("decodes 0.0", () => {
      const d = new BinaryPayloadDecoder([0x0000, 0x0000], "BIG_ENDIAN");
      expect(d.decodeFloat32()).toBe(0);
    });

    it("decodes negative float", () => {
      // -1.0 as float32 = 0xBF800000 → registers [0xBF80, 0x0000]
      const d = new BinaryPayloadDecoder([0xBF80, 0x0000], "BIG_ENDIAN");
      expect(d.decodeFloat32()).toBeCloseTo(-1.0, 4);
    });
  });

  describe("decodeFloat64", () => {
    it("decodes float 64 from four registers", () => {
      // 123.456 as float64
      // In big-endian: 0x405EDD2F1A9FBE77
      // Split into 4 UINT16: 0x405E, 0xDD2F, 0x1A9F, 0xBE77
      const d = new BinaryPayloadDecoder(
        [0x405E, 0xDD2F, 0x1A9F, 0xBE77],
        "BIG_ENDIAN",
      );
      expect(d.decodeFloat64()).toBeCloseTo(123.456, 2);
    });

    it("decodes 0.0", () => {
      const d = new BinaryPayloadDecoder([0, 0, 0, 0], "BIG_ENDIAN");
      expect(d.decodeFloat64()).toBe(0);
    });
  });

  describe("sequential position advancement", () => {
    it("advances position across multiple decodes", () => {
      const d = new BinaryPayloadDecoder([10, 20, 0, 100], "BIG_ENDIAN");
      // First: uint16 = 10
      expect(d.decodeUint16()).toBe(10);
      // Second: uint16 = 20
      expect(d.decodeUint16()).toBe(20);
      // Third: int32 = 0*65536 + 100 = 100
      expect(d.decodeInt32()).toBe(100);
    });
  });

  describe("getRegisterCount", () => {
    it.each([
      ["INT16", 1],
      ["UINT16", 1],
      ["BOOL", 1],
      ["INT32", 2],
      ["UINT32", 2],
      ["FLOAT32", 2],
      ["FLOAT64", 4],
    ] as [RegisterDataType, number][])(
      "%s requires %i register(s)",
      (dataType, expected) => {
        expect(BinaryPayloadDecoder.getRegisterCount(dataType)).toBe(expected);
      },
    );
  });

  describe("scale/offset pattern (integration example)", () => {
    it("applies scale and offset after decoding", () => {
      // Simulate a voltage register: register value 2305, scale 0.1 → 230.5V
      const d = new BinaryPayloadDecoder([2305], "BIG_ENDIAN");
      const raw = d.decodeUint16();
      const scaled = raw * 0.1;
      expect(scaled).toBeCloseTo(230.5, 1);
    });

    it("handles negative offset", () => {
      // Temperature: register 500, scale 0.1, offset -40 → 10°C
      const d = new BinaryPayloadDecoder([500], "BIG_ENDIAN");
      const raw = d.decodeInt16();
      const result = raw * 0.1 + -40;
      expect(result).toBeCloseTo(10, 1);
    });
  });
});
