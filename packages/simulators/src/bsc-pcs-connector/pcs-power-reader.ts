// packages/simulators/src/bsc-pcs-connector/pcs-power-reader.ts
//
// PCS→BSC ters kanal (PCS-BSC-GUC-LINKI SPEC K4/FR-2.1).
// PCS EMS S16 (REG_GRID_ACTIVE_POWER, sint16 kW) TCP Modbus ile okunur.
// İşaret: negatif = şarj, pozitif = deşarj (Wattox S16 konvansiyonu).

import { createConnection } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";

/** PCS güç kaynağı endpoint'i (config `connector.sim.pcsSources`). */
export interface PcsPowerSource {
  deviceId: string;
  host: string;
  port: number;
  unitId?: number;
}

/** Toplu okuma sonucu — kademeli bozulma görünürlüğü. */
export interface PcsPowerReading {
  /** Erişilebilen PCS'lerin toplam gücü (kW, işaretli). */
  totalKw: number;
  available: number;
  total: number;
}

/**
 * PCS güç okuma sözleşmesi.
 * - `readTotal()`: erişilemeyen PCS katkı 0; `available`/`total` sayılır.
 * - `close()`: tüm socket'leri kapatır (idempotent).
 */
export interface IPowerReader {
  readTotal(): Promise<PcsPowerReading>;
  close(): Promise<void>;
}

/** S16 (grid active power) adresi — Wattox EMS register map. */
const REG_GRID_ACTIVE_POWER = 0x2f7e;

/** Gerçek Modbus TCP ile PCS EMS S16 okuyan reader. */
export class TcpPcsPowerReader implements IPowerReader {
  private readonly clients = new Map<string, { client: ModbusTCPClient; socket: Socket }>();

  constructor(private readonly sources: readonly PcsPowerSource[]) {}

  async readTotal(): Promise<PcsPowerReading> {
    let totalKw = 0;
    let available = 0;
    // Sıralı okuma zorunlu değil — Promise.allSettled (repo kuralı).
    const readings = await Promise.allSettled(
      this.sources.map(async (source) => {
        const client = await this.clientFor(source);
        const res = await client.readInputRegisters(REG_GRID_ACTIVE_POWER, 1);
        const raw = (res.response.body.valuesAsArray as number[])[0] ?? 0;
        return raw > 0x7fff ? raw - 0x10000 : raw; // uint16 → sint16
      }),
    );
    for (const reading of readings) {
      if (reading.status === "fulfilled") {
        totalKw += reading.value;
        available++;
      }
    }
    return { totalKw, available, total: this.sources.length };
  }

  async close(): Promise<void> {
    for (const { socket } of this.clients.values()) socket.destroy();
    this.clients.clear();
  }

  private async clientFor(source: PcsPowerSource): Promise<ModbusTCPClient> {
    const existing = this.clients.get(source.deviceId);
    if (existing !== undefined && !existing.socket.destroyed) return existing.client;

    const socket = createConnection({ host: source.host, port: source.port });
    const client = new ModbusTCPClient(socket, source.unitId ?? 1);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`[PcsPowerReader] baglanti zaman asimi: ${source.deviceId}`));
      }, 3000);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("error", (err) => {
        clearTimeout(timer);
        socket.destroy();
        reject(err);
      });
    });
    this.clients.set(source.deviceId, { client, socket });
    return client;
  }
}
