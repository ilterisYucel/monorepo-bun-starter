import { describe, it, expect, afterEach } from "vitest";
import { WattoxPcsSimulator } from "../wattox-pcs/simulator";
import { BmsPortServer } from "../wattox-pcs/bms-port-server";
import { TcpBmsTarget } from "./tcp-target";
import { BMS_SOC } from "../wattox-pcs/register-map";

/**
 * TcpBmsTarget uçtan uca sözleşmesi — gerçek BmsPortServer'a FC 0x10 yazımı:
 * - connect + writeRegisters + close yaşam döngüsü.
 * - Sunucu kapalıyken connect throw → yazım başarısız (connector fail sayar).
 * - Yeniden bağlanma: close sonrası tekrar connect + yazım.
 */

let server: BmsPortServer | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
});

describe("TcpBmsTarget", () => {
  it("BmsPortServer'a FC 0x10 yazar; simülatör deposu güncellenir", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const target = new TcpBmsTarget("127.0.0.1", port);
    await target.connect();
    await target.writeRegisters(BMS_SOC, [8720]);
    expect(sim.readRegister(BMS_SOC)).toBe(8720);
    await target.close();
  });

  it("sunucu kapalıyken connect throw eder", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();
    await server.stop();
    server = undefined;

    const target = new TcpBmsTarget("127.0.0.1", port);
    await expect(target.connect()).rejects.toThrow();
    await target.close();
  });

  it("close sonrası yeniden connect + yazım çalışır (retry deseni)", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

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
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const target = new TcpBmsTarget("127.0.0.1", port);
    await target.connect();
    await expect(target.writeRegisters(767, [1])).rejects.toThrow();
    await target.close();
  });
});
