// packages/simulators/src/bsc-pcs-connector/source-reader.ts
//
// Connector kaynak okuma soyutlaması (SIMULATOR-MIMARISI UC-4/T-7):
// - `TcpSourceReader` (üretim): kaynak BSC'yi GERÇEK Modbus TCP ile okur.
// - `AdapterSourceReader` (geçiş shim'i): in-process adapter map'ini okur;
//   `SimulatorHost` devreye girip registry silinince kaldırılır.

import { createConnection } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { BscPcsSourceRef } from "./mapping";

/** Kaynak register okuma sözleşmesi — connector `tick` bunu kullanır. */
export interface ISourceReader {
  read(from: BscPcsSourceRef): Promise<number>;
  close?(): Promise<void>;
}

/** Bağlı kaynak endpoint'i (host/port + unit). */
export interface SourceEndpoint {
  readonly host: string;
  readonly port: number;
  readonly unitId?: number;
}

/** Kaynak değerini adapter üzerinden okur (size>1 → big-endian kelime birleştir). */
async function readFromAdapter(
  adapter: IModbusSimulatorAdapter,
  from: BscPcsSourceRef,
): Promise<number> {
  const size = from.size ?? 1;
  if (size === 1) {
    return from.table === "input"
      ? adapter.readInputRegister(from.address)
      : adapter.readHoldingRegister(from.address);
  }
  const words =
    from.table === "input"
      ? await adapter.readInputRegisters(from.address, size)
      : await adapter.readHoldingRegisters(from.address, size);
  return combineWords(words, size, from.signed === true);
}

/** Big-endian kelime dizisini tek değere çevirir; signed ise işaretler. */
export function combineWords(words: number[], size: number, signed: boolean): number {
  let value = 0;
  for (const word of words) {
    value = value * 0x10000 + (word & 0xffff);
  }
  if (signed && value >= 2 ** (16 * size - 1)) {
    value -= 2 ** (16 * size);
  }
  return value;
}

/** In-process adapter map'i okuyan reader (geçiş shim'i). */
export class AdapterSourceReader implements ISourceReader {
  constructor(private readonly adapters: ReadonlyMap<string, IModbusSimulatorAdapter>) {}

  async read(from: BscPcsSourceRef): Promise<number> {
    const adapter = this.adapters.get(from.deviceId);
    if (adapter === undefined) {
      throw new Error(`Kaynak adapter yok: ${from.deviceId}`);
    }
    return readFromAdapter(adapter, from);
  }
}

/** Kaynak BSC'yi gerçek Modbus TCP ile okuyan reader (deviceId→endpoint). */
export class TcpSourceReader implements ISourceReader {
  private readonly clients = new Map<string, { client: ModbusTCPClient; socket: Socket }>();

  constructor(private readonly endpoints: ReadonlyMap<string, SourceEndpoint>) {}

  async read(from: BscPcsSourceRef): Promise<number> {
    const client = await this.clientFor(from.deviceId);
    const size = from.size ?? 1;
    const res =
      from.table === "input"
        ? await client.readInputRegisters(from.address, size)
        : await client.readHoldingRegisters(from.address, size);
    const words = res.response.body.valuesAsArray as number[];
    if (size === 1) return words[0] ?? 0;
    return combineWords(words, size, from.signed === true);
  }

  async close(): Promise<void> {
    for (const { socket } of this.clients.values()) {
      socket.destroy();
    }
    this.clients.clear();
  }

  private async clientFor(deviceId: string): Promise<ModbusTCPClient> {
    const existing = this.clients.get(deviceId);
    if (existing !== undefined && !existing.socket.destroyed) {
      return existing.client;
    }
    const endpoint = this.endpoints.get(deviceId);
    if (endpoint === undefined) {
      throw new Error(`Kaynak endpoint yok: ${deviceId}`);
    }
    const socket = createConnection({ host: endpoint.host, port: endpoint.port });
    const client = new ModbusTCPClient(socket, endpoint.unitId ?? 1);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", (err) => {
        socket.destroy();
        reject(err);
      });
    });
    this.clients.set(deviceId, { client, socket });
    return client;
  }
}
