import { describe, it, expect, afterEach } from "vitest";
import { WattoxPcsSimulator } from "../wattox-pcs";
import { SET_ACTIVE_POWER, SET_COMMAND_SOURCE } from "../wattox-pcs/register-map";
import { TcpPcsPowerReader } from "./pcs-power-reader";
import type { PcsPowerSource } from "./pcs-power-reader";

/**
 * PCS→BSC ters kanal (PCS-BSC-GUC-LINKI UC-2):
 * - S16 (REG_GRID_ACTIVE_POWER 0x2f7e) sint16 kW okunur (gerçek Modbus TCP).
 * - Toplam işaretli güç; erişilemeyen PCS katkı 0 + available/total sayacı.
 */

const running: WattoxPcsSimulator[] = [];

afterEach(async () => {
  await Promise.allSettled(running.splice(0).map((sim) => sim.stop()));
});

async function startPcs(deviceId: string, powerKw: number): Promise<PcsPowerSource> {
  const sim = new WattoxPcsSimulator({
    deviceId,
    network: { host: "127.0.0.1", port: 0 },
  });
  await sim.start();
  sim.writeSetting(SET_COMMAND_SOURCE, 1); // EMS komutları için (S01=1)
  sim.writeSetting(SET_ACTIVE_POWER, powerKw & 0xffff);
  running.push(sim);
  return { deviceId, host: "127.0.0.1", port: sim.port() };
}

describe("TcpPcsPowerReader", () => {
  it("PCS S16 gücünü işaretli okur (negatif = şarj)", async () => {
    const reader = new TcpPcsPowerReader([await startPcs("PCS-1", -300)]);
    const reading = await reader.readTotal();
    await reader.close();
    expect(reading).toEqual({ totalKw: -300, available: 1, total: 1 });
  });

  it("birden fazla PCS toplanır", async () => {
    const sources = [await startPcs("PCS-1", -300), await startPcs("PCS-2", -200)];
    const reader = new TcpPcsPowerReader(sources);
    const reading = await reader.readTotal();
    await reader.close();
    expect(reading.totalKw).toBe(-500);
    expect(reading.available).toBe(2);
  });

  it("erişilemeyen PCS katkı 0; available kısmi", async () => {
    const source = await startPcs("PCS-1", 400);
    const reader = new TcpPcsPowerReader([
      source,
      { deviceId: "PCS-X", host: "127.0.0.1", port: 1 },
    ]);
    const reading = await reader.readTotal();
    await reader.close();
    expect(reading).toEqual({ totalKw: 400, available: 1, total: 2 });
  });
});
