import { describe, it, expect, beforeEach } from "vitest";
import { ImdSimulator } from "./imd";
import { ControlPanelIoSimulator } from "./control-panel-io";
import { DcMeterSimulator } from "./dc-meter";
import { HvacSimulator } from "./hvac";
import { BSCSimulator } from "./bsc";
import { EnergyAnalyzerSimulator } from "./energy-analyzer";
import { WattoxPcsSimulator } from "./wattox-pcs";

/**
 * Simülatör senaryo enjeksiyonu (`inject`) sözleşmesi — dev/debug test desteği.
 * Her simülatör bilinen senaryoyu uygular (`true`), bilinmeyeni reddeder (`false`).
 * Bu yüzey, stack entegrasyon testlerinin arıza/koruma zincirini tetiklemesini
 * sağlar (DebugInjector → SimulatorHost.inject).
 */
describe("simülatör inject sözleşmesi", () => {
  it("IMD: fault/healthy/device_error uygular, bilinmeyeni reddeder", () => {
    const sim = new ImdSimulator({ deviceId: "IMD-1" });
    expect(sim.inject("fault")).toBe(true);
    expect(sim.inject("warning")).toBe(true);
    expect(sim.inject("healthy")).toBe(true);
    expect(sim.inject("device_error")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });

  it("ControlPanelIo: kapı senaryolarını uygular", () => {
    const sim = new ControlPanelIoSimulator({ deviceId: "CPIO-1" });
    expect(sim.inject("battery_door_open")).toBe(true);
    expect(sim.readDiscreteInput(0)).toBe(true);
    expect(sim.inject("battery_door_close")).toBe(true);
    expect(sim.readDiscreteInput(0)).toBe(false);
    expect(sim.inject("yok")).toBe(false);
  });

  it("DcMeter: overcurrent ölçümü yazar", () => {
    const sim = new DcMeterSimulator({ deviceId: "DCM-1" });
    expect(sim.inject("overcurrent")).toBe(true);
    expect(sim.inject("nominal")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });

  it("HVAC: hot/nominal uygular", () => {
    const sim = new HvacSimulator({ deviceId: "HVAC-1" });
    expect(sim.inject("hot")).toBe(true);
    expect(sim.inject("nominal")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });

  it("BSC: overheat/diff_temp/fault/nominal uygular", () => {
    const sim = new BSCSimulator({ deviceId: "BSC-1", rackCount: 8, registers: [] });
    expect(sim.inject("overheat")).toBe(true);
    expect(sim.inject("diff_temp")).toBe(true);
    expect(sim.inject("fault")).toBe(true);
    expect(sim.inject("nominal")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });


  it("WattoxPcs: fault/door_open/nominal uygular", () => {
    const sim = new WattoxPcsSimulator({ deviceId: "PCS-1",});
    expect(sim.inject("fault")).toBe(true);
    expect(sim.inject("door_open")).toBe(true);
    expect(sim.inject("nominal")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });

  it("EnergyAnalyzer: aux_loss/nominal uygular", () => {
    const sim = new EnergyAnalyzerSimulator({ deviceId: "EA-1" });
    expect(sim.inject("aux_loss")).toBe(true);
    expect(sim.inject("nominal")).toBe(true);
    expect(sim.inject("yok")).toBe(false);
  });
});
