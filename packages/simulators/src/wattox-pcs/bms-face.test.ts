import { describe, it, expect, afterEach } from "vitest";
import { connect as netConnect } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import { WattoxPcsSimulator } from "./simulator";
import { createWattoxBmsBridge } from "./bms-face-adapter";
import { BMS_SOC, REG_OP_STATUS } from "./register-map";
import type { ModbusServerBridge } from "../server";

/**
 * BMS-yüzü bridge sözleşmesi (UC-2, AK-2.3/AK-2.4):
 * - FC 03 BMS bloğunu okur; FC 06/10 BMS bloğuna yazar (setBmsRegister).
 * - BMS bloğu dışı okuma/yazma → exception 0x02.
 */

let bridge: ModbusServerBridge | undefined;
let socket: Socket | undefined;

afterEach(async () => {
  socket?.destroy();
  socket = undefined;
  await bridge?.stop();
  bridge = undefined;
});

const connectClient = async (port: number): Promise<ModbusTCPClient> => {
  const s = netConnect({ host: "127.0.0.1", port });
  const client = new ModbusTCPClient(s, 1);
  await new Promise<void>((resolve, reject) => {
    s.once("connect", resolve);
    s.once("error", reject);
  });
  socket = s;
  return client;
};

const openBms = async (): Promise<{ sim: WattoxPcsSimulator; client: ModbusTCPClient }> => {
  const sim = new WattoxPcsSimulator({});
  bridge = createWattoxBmsBridge(sim, { host: "127.0.0.1", port: 0 });
  await bridge.start();
  const client = await connectClient(bridge.port());
  return { sim, client };
};

describe("Wattox BMS yüzü (ModbusServerBridge)", () => {
  it("BMS bloğu FC 03 okuması anlık değeri döner", async () => {
    const { client } = await openBms();
    const res = await client.readHoldingRegisters(BMS_SOC, 1);
    expect((res.response.body.valuesAsArray as number[])[0]).toBe(500); // SOC %50.0
  });

  it("BMS bloğu FC 06 yazımı simülatör deposuna uygulanır", async () => {
    const { sim, client } = await openBms();
    await client.writeSingleRegister(BMS_SOC, 8720);
    expect(sim.readRegister(BMS_SOC)).toBe(8720);
  });

  it("BMS bloğu FC 10 çoklu yazım uygulanır", async () => {
    const { sim, client } = await openBms();
    await client.writeMultipleRegisters(BMS_SOC, [1000, 2000]);
    expect(sim.readRegister(BMS_SOC)).toBe(1000);
    expect(sim.readRegister(BMS_SOC + 1)).toBe(2000);
  });

  it("AK-2.3 — BMS bloğu DIŞI yazım 0x02 (767 ve 791)", async () => {
    const { client } = await openBms();
    await expect(client.writeSingleRegister(767, 1)).rejects.toThrow();
    await expect(client.writeSingleRegister(791, 1)).rejects.toThrow();
  });

  it("AK-2.4 — BMS bloğu DIŞI okuma 0x02", async () => {
    const { client } = await openBms();
    await expect(client.readHoldingRegisters(REG_OP_STATUS, 1)).rejects.toThrow();
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow();
  });
});
