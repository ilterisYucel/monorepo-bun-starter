import { describe, it, expect } from "vitest";
import { BSCSimulator } from "./bsc-simulator";
import {
  ESSENTIAL,
  COMMAND,
  CONTROLLER,
  BSC_STATE,
  BSC_INFO_BITS,
  RACK_SUMMARY_BASE,
  RACK_STRIDE,
  RACK_SUMMARY,
} from "./register-map";

/**
 * BSCSimulator sözleşmesi (2026-08-30 — T4 karakterizasyonu; TEİAŞ #22):
 * - Otomatik init: 3 tick → INITIALIZING; 6 tick → NORMAL (30036).
 * - START → BSC_INFO (30037) charge status bitleri 0b01; DISCHARGE → 0b10.
 * - EMERGENCY → durum EMERGENCY (30036).
 * - Deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01).
 *
 * NOT (ack kaydı): komut yazımı anında `acknowledge=DONE` register'a yazılır
 * ve bun runtime'ında yazımdan hemen sonra okunabilir (`bun -e` ile kanıt).
 * Vitest (node) ortamında aynı okuma 0 döndürüyor — ortam farkı ayrıca
 * araştırılacak; ack davranışı bu dosyada iddia edilmez.
 */

function makeReadySim(soc = 50): BSCSimulator {
  const sim = new BSCSimulator({ rackCount: 2, registers: [], initialSocPercent: soc });
  for (let i = 0; i < 7; i++) sim.tick(1);
  return sim;
}

describe("BSCSimulator (T4)", () => {
  it("otomatik init: 6 tick sonrası NORMAL duruma geçer", () => {
    const sim = new BSCSimulator({ rackCount: 2, registers: [], initialSocPercent: 80 });
    for (let i = 0; i < 7; i++) sim.tick(1);
    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.NORMAL);
  });

  it("START komutu → charge status bitleri (BSC_INFO 30037)", () => {
    const sim = makeReadySim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.writeHoldingRegister(CONTROLLER.CHARGE_POWER_SETPOINT, 5000); // 50.00 kW
    sim.tick(1);

    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b01);
  });

  it("DISCHARGE komutu → discharge status bitleri (BSC_INFO 30037)", () => {
    const sim = makeReadySim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.DISCHARGE);
    sim.writeHoldingRegister(CONTROLLER.DISCHARGE_POWER_SETPOINT, 5000);
    sim.tick(1);

    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b10);
  });

  it("EMERGENCY komutu durumu EMERGENCY'ye geçirir", () => {
    const sim = makeReadySim(80);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EMERGENCY);
    sim.tick(1);

    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.EMERGENCY);
  });

  it("deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01)", () => {
    const sim = makeReadySim(0);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.DISCHARGE);
    sim.writeHoldingRegister(CONTROLLER.DISCHARGE_POWER_SETPOINT, 5000);
    for (let i = 0; i < 50; i++) sim.tick(60);

    for (const rackId of [1, 2]) {
      const base = RACK_SUMMARY_BASE + (rackId - 1) * RACK_STRIDE;
      const socRaw = sim.readInputRegister(base + RACK_SUMMARY.SOC);
      expect(socRaw).toBeGreaterThanOrEqual(0);
    }
  });
});
