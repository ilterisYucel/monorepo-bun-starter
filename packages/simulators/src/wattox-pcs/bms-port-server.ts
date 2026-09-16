// BmsPortServer — Wattox PCS simülatörünün BMS port yüzü (minimal Modbus TCP
// sunucu). Gerçek donanımın EMS/BMS link ayrımını simüle eder:
// EMS yüzü in-process adapter (BMS bloğu RO), BMS yüzü bu TCP sunucudur
// (0x0300-0x0316 yazılabilir). Kaynak: BSC-PCS-CONNECTOR-MIMARISI.md §4.2.

import { createServer } from "node:net";
import type { Server, Socket } from "node:net";
import type { WattoxPcsSimulator } from "./simulator";
import { BMS_BASE, BMS_SIZE } from "./register-map";

/** BmsPortServer yapılandırması — tek obje (DI kuralı 3). */
export interface BmsPortServerConfig {
  simulator: WattoxPcsSimulator;
  /** Dinlenecek port — 0 = ephemaral (test); verilmezse 15502. */
  port?: number;
}

/**
 * BmsPortServer — sözleşme (test: bms-port-server.test.ts):
 * - FC 0x03 (okuma), 0x06 (tek yazım), 0x10 (çoklu yazım) — yalnızca BMS
 *   bloğu (768-790 ondalık); dışı → exception 0x02; bilinmeyen FC → 0x01.
 * - Yazımlar simulator.setBmsRegister ile uygulanır.
 * - start()/stop() idempotent; aynı anda 1 istemci.
 */
export class BmsPortServer {
  private readonly simulator: WattoxPcsSimulator;
  private readonly port: number;
  private server: Server | undefined;
  private socket: Socket | undefined;
  private boundPort = 0;

  constructor(config: BmsPortServerConfig) {
    this.simulator = config.simulator;
    this.port = config.port ?? 15502;
  }

  /** Komut — sunucuyu başlatır; dönen port (ephemeral'de gerçek port). */
  async start(): Promise<number> {
    if (this.server) return this.boundPort;

    this.server = createServer((socket) => {
      if (this.socket) {
        this.socket.destroy();
      }
      this.socket = socket;
      socket.on("data", (chunk: Buffer) => {
        try {
          this.handleFrame(socket, chunk);
        } catch {
          socket.destroy();
        }
      });
      socket.on("close", () => {
        if (this.socket === socket) this.socket = undefined;
      });
      socket.on("error", () => {
        // istemci hatası sunucuyu düşürmez
      });
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, "0.0.0.0", resolve);
    });
    const address = this.server.address();
    this.boundPort = typeof address === "object" && address ? address.port : this.port;
    return this.boundPort;
  }

  /** Komut — sunucuyu durdurur (idempotent). */
  async stop(): Promise<void> {
    this.socket?.destroy();
    this.socket = undefined;
    const server = this.server;
    this.server = undefined;
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  }

  private handleFrame(socket: Socket, chunk: Buffer): void {
    if (chunk.length < 8) return; // eksik MBAP — sessiz
    const transaction = chunk.readUInt16BE(0);
    const unitId = chunk[6]!;
    const fn = chunk[7]!;

    let response: Buffer;
    try {
      switch (fn) {
        case 0x03:
          response = this.handleRead(transaction, unitId, chunk);
          break;
        case 0x06:
          response = this.handleWriteSingle(transaction, unitId, chunk);
          break;
        case 0x10:
          response = this.handleWriteMultiple(transaction, unitId, chunk);
          break;
        default:
          response = this.exception(transaction, unitId, fn, 0x01);
      }
    } catch {
      response = this.exception(transaction, unitId, fn, 0x02);
    }
    socket.write(response);
  }

  private handleRead(transaction: number, unitId: number, chunk: Buffer): Buffer {
    const address = chunk.readUInt16BE(8);
    const count = chunk.readUInt16BE(10);
    if (count === 0 || !this.inBmsRange(address) || !this.inBmsRange(address + count - 1)) {
      return this.exception(transaction, unitId, 0x03, 0x02);
    }
    const pdu = Buffer.alloc(2 + count * 2);
    pdu[0] = 0x03;
    pdu[1] = count * 2;
    for (let i = 0; i < count; i++) {
      pdu.writeUInt16BE(this.simulator.readRegister(address + i), 2 + i * 2);
    }
    return this.mbap(transaction, unitId, pdu);
  }

  private handleWriteSingle(transaction: number, unitId: number, chunk: Buffer): Buffer {
    const address = chunk.readUInt16BE(8);
    const value = chunk.readUInt16BE(10);
    if (!this.inBmsRange(address)) {
      return this.exception(transaction, unitId, 0x06, 0x02);
    }
    this.simulator.setBmsRegister(address, value);
    const pdu = Buffer.alloc(5);
    pdu[0] = 0x06;
    pdu.writeUInt16BE(address, 1);
    pdu.writeUInt16BE(value, 3);
    return this.mbap(transaction, unitId, pdu);
  }

  private handleWriteMultiple(transaction: number, unitId: number, chunk: Buffer): Buffer {
    const address = chunk.readUInt16BE(8);
    const count = chunk.readUInt16BE(10);
    if (count === 0 || !this.inBmsRange(address) || !this.inBmsRange(address + count - 1)) {
      return this.exception(transaction, unitId, 0x10, 0x02);
    }
    for (let i = 0; i < count; i++) {
      this.simulator.setBmsRegister(address + i, chunk.readUInt16BE(13 + i * 2));
    }
    const pdu = Buffer.alloc(5);
    pdu[0] = 0x10;
    pdu.writeUInt16BE(address, 1);
    pdu.writeUInt16BE(count, 3);
    return this.mbap(transaction, unitId, pdu);
  }

  private exception(
    transaction: number,
    unitId: number,
    fn: number,
    code: number,
  ): Buffer {
    const pdu = Buffer.from([fn | 0x80, code]);
    return this.mbap(transaction, unitId, pdu);
  }

  private mbap(transaction: number, unitId: number, pdu: Buffer): Buffer {
    const header = Buffer.alloc(7);
    header.writeUInt16BE(transaction, 0);
    header.writeUInt16BE(0, 2);
    header.writeUInt16BE(pdu.length + 1, 4);
    header[6] = unitId;
    return Buffer.concat([header, pdu]);
  }

  private inBmsRange(address: number): boolean {
    return address >= BMS_BASE && address < BMS_BASE + BMS_SIZE;
  }
}
