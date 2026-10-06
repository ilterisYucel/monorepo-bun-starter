// WattoxBmsFaceAdapter — Wattox PCS'nin BMS link yüzünü `IModbusSimulatorAdapter`
// olarak sunar. `ModbusServerBridge` bu adapter'ı BMS-yüzü bridge'inde kullanır:
// holding okuma/yazma BMS bloğuna (0x0300-0x0316) eşlenir; blok dışı erişim
// bridge'in `readProtected`/`writeProtected` aralıklarıyla 0x02'ye çevrilir.
//
// Not: EMS yüzü (`WattoxPcsAdapter`) BMS bloğunu RO tutar (writeSetting yok sayar);
// bu yüz ise BMS'i OKUYUP YAZAR (eski `BmsPortServer` davranışı).

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { ModbusServerBridge } from "../server";
import { BMS_BASE, BMS_SIZE } from "./register-map";
import type { WattoxPcsSimulator } from "./simulator";

/** BMS bloğu (0x0300-0x0316) dışındaki korumalı aralıklar — okuma ve yazma. */
export const OUTSIDE_BMS_RANGES: readonly (readonly [number, number])[] = [
  [0, BMS_BASE - 1],
  [BMS_BASE + BMS_SIZE, 0xffff],
];

/**
 * Wattox PCS BMS-yüzü bridge'ini kurar — BMS bloğu dışı okuma/yazma 0x02
 * (eski `BmsPortServer` davranışı birebir korunur). Tek kaynak: `simulator.ts`
 * ve testler bu fabrikayı kullanır.
 */
export function createWattoxBmsBridge(
  simulator: WattoxPcsSimulator,
  options: { readonly host?: string; readonly port: number },
): ModbusServerBridge {
  return new ModbusServerBridge({
    adapter: new WattoxBmsFaceAdapter(simulator),
    host: options.host ?? "0.0.0.0",
    port: options.port,
    writeProtected: { table: "holding", ranges: OUTSIDE_BMS_RANGES },
    readProtected: { table: "holding", ranges: OUTSIDE_BMS_RANGES },
  });
}

export class WattoxBmsFaceAdapter implements IModbusSimulatorAdapter {
  constructor(private readonly simulator: WattoxPcsSimulator) {}

  async readHoldingRegister(address: number): Promise<number> {
    return this.simulator.readRegister(address);
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(this.simulator.readRegister(address + i));
    return values;
  }

  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.simulator.setBmsRegister(address, value);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    values.forEach((value, i) => this.simulator.setBmsRegister(address + i, value));
  }

  async readInputRegister(address: number): Promise<number> {
    return this.simulator.readRegister(address);
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(this.simulator.readRegister(address + i));
    return values;
  }

  async readCoil(): Promise<boolean> {
    return false;
  }

  async readCoils(): Promise<boolean[]> {
    return [];
  }

  async writeCoil(): Promise<void> {
    // coil alanı yok
  }

  async writeMultipleCoils(): Promise<void> {
    // coil alanı yok
  }

  async readDiscreteInput(): Promise<boolean> {
    return false;
  }

  async readDiscreteInputs(): Promise<boolean[]> {
    return [];
  }
}
