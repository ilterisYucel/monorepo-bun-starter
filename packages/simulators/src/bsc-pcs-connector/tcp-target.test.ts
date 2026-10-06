import { describe, it, expect, afterEach } from "vitest";
import { WattoxPcsSimulator } from "../wattox-pcs/simulator";
import { createWattoxBmsBridge } from "../wattox-pcs/bms-face-adapter";
import { TcpBmsTarget } from "./tcp-target";
import { BMS_SOC } from "../wattox-pcs/register-map";
import type { ModbusServerBridge } from "../server";

/**
 * TcpBmsTarget uçtan uca sözleşmesi — gerçek BMS-yüzü ModbusServerBridge'e FC 0x10:
 * - connect + writeRegisters + close yaşam döngüsü.
 * - Sunucu kapalıyken connect throw → yazım başarısız (connector fail sayar).
 * - Yeniden bağlanma: close sonrası tekrar connect + yazım.
 */

let bridge: ModbusServerBridge | undefined;

afterEach(async () => {
  await bridge?.stop();
  bridge = undefined;
});

const startBridge = async (sim: WattoxPcsSimulator): Promise<number> => {
  bridge = createWattoxBmsBridge(sim, { host: "127.0.0.1", port: 0 });
  await bridge.start();
  return bridge.port();
};

describe("TcpBmsTarget", () => {
  it("BMS-yüzü bridge'e FC 0x10 yazar; simülatör deposu güncellenir", async () => {
    const sim = new WattoxPcsSimulator({});
    const port = await startBridge(sim);

    const target = new TcpBmsTarget("127.0.0.1", port);
    await target.connect();
    await target.writeRegisters(BMS_SOC, [8720]);
    expect(sim.readRegister(BMS_SOC)).toBe(8720);
    await target.close();
  });

  it("sunucu kapalıyken connect throw eder", async () => {
    const sim = new WattoxPcsSimulator({});
    const port = await startBridge(sim);
    await bridge!.stop();
    bridge = undefined;

    const target = new TcpBmsTarget("127.0.0.1", port);
    await expect(target.connect()).rejects.toThrow();
    await target.close();
  });

  it("close sonrası yeniden connect + yazım çalışır (retry deseni)", async () => {
    const sim = new WattoxPcsSimulator({});
    const port = await startBridge(sim);

    const target = new TcpBmsTarget("127.0.0.1", port);
    await target.connect();
    await target.writeRegisters(BMS_SOC, [1000]);
    await target.close();
    await target.connect();
    await target.writeRegisters(BMS_SOC, [2000]);
    expect(sim.readRegister(BMS_SOC)).toBe(2000);
    await target.close();
  });

  it("BMS bloğu dışına yazım → Modbus exception throw", async () => {
    const sim = new WattoxPcsSimulator({});
    const port = await startBridge(sim);

    const target = new TcpBmsTarget("127.0.0.1", port);
    await target.connect();
    await expect(target.writeRegisters(767, [1])).rejects.toThrow();
    await target.close();
  });
});
