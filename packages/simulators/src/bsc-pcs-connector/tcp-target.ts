// IBmsTarget — connector'ın PCS BMS portuna yazım sözleşmesi.
// Testlerde fake, üretimde TcpBmsTarget (Modbus TCP FC 0x10 yazımları).

/**
 * IBmsTarget — BMS port yazım kanalı.
 * - connect(): idempotent bağlantı; başarısızsa throw (connector fail sayar).
 * - writeRegisters(): FC 0x10 çoklu yazım; başarısızsa throw.
 * - close(): kaynak temizliği.
 */
export interface IBmsTarget {
  connect(): Promise<void>;
  writeRegisters(address: number, values: number[]): Promise<void>;
  close(): Promise<void>;
}

import { createConnection } from "node:net";
import type { Socket } from "node:net";

/**
 * TcpBmsTarget — Modbus TCP üzerinden BMS portuna FC 0x10 yazım yapan hedef.
 * Bağlantı kopuksa her connect() yeni socket açar.
 */
export class TcpBmsTarget implements IBmsTarget {
  private socket: Socket | undefined;

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  async connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed) return;

    const socket = createConnection({ host: this.host, port: this.port });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", (err) => {
        socket.destroy();
        reject(err);
      });
    });
    this.socket = socket;
  }

  async writeRegisters(address: number, values: number[]): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      await this.connect();
    }
    const socket = this.socket!;

    const pdu = Buffer.alloc(7 + values.length * 2);
    pdu[0] = 0x10;
    pdu.writeUInt16BE(address, 1);
    pdu.writeUInt16BE(values.length, 3);
    pdu[5] = values.length * 2;
    values.forEach((v, i) => pdu.writeUInt16BE(v & 0xffff, 6 + i * 2));

    const frame = Buffer.alloc(7 + pdu.length);
    frame.writeUInt16BE(1, 0); // transaction
    frame.writeUInt16BE(0, 2);
    frame.writeUInt16BE(pdu.length + 1, 4);
    frame[6] = 1; // unit id
    pdu.copy(frame, 7);

    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error): void => {
        cleanup();
        reject(err);
      };
      const onData = (chunk: Buffer): void => {
        const fn = chunk[7];
        cleanup();
        if (fn === 0x10) {
          resolve();
        } else if (fn === 0x90) {
          reject(new Error(`[TcpBmsTarget] Modbus exception: ${chunk[8]}`));
        } else {
          reject(new Error(`[TcpBmsTarget] Beklenmeyen yanit: ${fn}`));
        }
      };
      const onTimeout = (): void => {
        cleanup();
        reject(new Error("[TcpBmsTarget] Yazim timeout"));
      };
      const timer = setTimeout(onTimeout, 3000);
      const cleanup = (): void => {
        clearTimeout(timer);
        socket.off("data", onData);
        socket.off("error", onError);
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.write(frame);
    });
  }

  async close(): Promise<void> {
    this.socket?.destroy();
    this.socket = undefined;
  }
}
