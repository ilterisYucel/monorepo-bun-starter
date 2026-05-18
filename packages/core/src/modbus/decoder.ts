import type { ByteOrder } from "@gd-monorepo/shared-types";

// packages/core/modbus/decoder.ts
export type RegisterTableType =
  | "COIL"
  | "DISCRETE_INPUT"
  | "INPUT_REGISTER"
  | "HOLDING_REGISTER";
export type RegisterDataType =
  | "BOOL"
  | "INT16"
  | "UINT16"
  | "INT32"
  | "UINT32"
  | "FLOAT32"
  | "FLOAT64";

export class BinaryPayloadDecoder {
  private buffer: Buffer;
  private position: number = 0;
  private byteOrder: ByteOrder;

  constructor(registers: number[], byteOrder: ByteOrder) {
    this.byteOrder = byteOrder;
    // Modbus register'ları 16-bit, Buffer'a çevir
    this.buffer = Buffer.alloc(registers.length * 2);
    for (let i = 0; i < registers.length; i++) {
      const value = registers[i] as number;
      this.buffer.writeUInt16BE(value, i * 2);
    }

    // Byte order'a göre buffer'ı düzenle
    this.applyByteOrder();
  }

  private applyByteOrder(): void {
    switch (this.byteOrder) {
      case "LITTLE_ENDIAN": // Little Endian (reverse all bytes)
        this.buffer = Buffer.from(this.buffer.reverse());
        break;
      case "BIG_ENDIAN_SWAP": // Swap words (4-byte swap)
        for (let i = 0; i < this.buffer.length; i += 4) {
          const word1 = this.buffer.readUInt16BE(i);
          const word2 = this.buffer.readUInt16BE(i + 2);
          this.buffer.writeUInt16BE(word2, i);
          this.buffer.writeUInt16BE(word1, i + 2);
        }
        break;
      case "LITTLE_ENDIAN_SWAP":
        // 4-byte reverse word
        for (let i = 0; i < this.buffer.length; i += 4) {
          const b0 = this.buffer[i] as number;
          const b1 = this.buffer[i + 1] as number;
          const b2 = this.buffer[i + 2] as number;
          const b3 = this.buffer[i + 3] as number;
          this.buffer[i] = b2;
          this.buffer[i + 1] = b3;
          this.buffer[i + 2] = b0;
          this.buffer[i + 3] = b1;
        }
        break;
      default: // 'ABCD' - do nothing
        break;
    }
  }

  decodeUint16(): number {
    const value = this.buffer.readUInt16BE(this.position);
    this.position += 2;
    return value;
  }

  decodeInt16(): number {
    const value = this.buffer.readInt16BE(this.position);
    this.position += 2;
    return value;
  }

  decodeUint32(): number {
    const value = this.buffer.readUInt32BE(this.position);
    this.position += 4;
    return value;
  }

  decodeInt32(): number {
    const value = this.buffer.readInt32BE(this.position);
    this.position += 4;
    return value;
  }

  decodeFloat32(): number {
    const value = this.buffer.readFloatBE(this.position);
    this.position += 4;
    return value;
  }

  decodeFloat64(): number {
    const value = this.buffer.readDoubleBE(this.position);
    this.position += 8;
    return value;
  }

  static getRegisterCount(dataType: RegisterDataType): number {
    switch (dataType) {
      case "INT16":
      case "UINT16":
        return 1;
      case "INT32":
      case "UINT32":
      case "FLOAT32":
        return 2;
      case "FLOAT64":
        return 4;
      default:
        return 1;
    }
  }
}
