import { describe, it, expect } from "vitest";
import type { ISimulator } from "./contracts";
import { BSCSimulator } from "./bsc";
import { HvacSimulator } from "./hvac";
import { CbSimulator } from "./cb";
import { DcOutputSimulator } from "./dc-output";
import { DcMeterSimulator } from "./dc-meter";
import { EnergyAnalyzerSimulator } from "./energy-analyzer";
import { ControlPanelIoSimulator } from "./control-panel-io";
import { ImdSimulator } from "./imd";
import { FssSimulator } from "./fss";
import { DemoMvStationSimulator } from "./demo-mv-station";
import { WattoxPcsSimulator } from "./wattox-pcs";
import { BscPcsConnectorAdapter } from "./bsc-pcs-connector";

/**
 * ISimulator sözleşmesi (SIMULATOR-MIMARISI REV.03, UC-5):
 * tüm host simülatörleri deviceId + start/stop sağlar; inject opsiyoneldir.
 */

const allSimulators = (): ISimulator[] => [
  new BSCSimulator({ deviceId: "BSC-1", rackCount: 1, registers: [] }),
  new HvacSimulator({ deviceId: "HVAC-1" }),
  new CbSimulator({ deviceId: "CB-1" }),
  new DcOutputSimulator({ deviceId: "DC-1" }),
  new DcMeterSimulator({ deviceId: "DCM-1" }),
  new EnergyAnalyzerSimulator({ deviceId: "EA-1" }),
  new ControlPanelIoSimulator({ deviceId: "CPIO-1" }),
  new ImdSimulator({ deviceId: "IMD-1" }),
  new FssSimulator({ deviceId: "FSS-1" }),
  new DemoMvStationSimulator({ deviceId: "DEMO-MV-1" }),
  new WattoxPcsSimulator({ deviceId: "PCS-1" }),
  new BscPcsConnectorAdapter({
    deviceId: "BSC-PCS-CONNECTOR-1",
    mapping: { target: { host: "127.0.0.1", port: 1 }, intervalMs: 5000, mappings: [] },
    source: { read: async () => 0 },
  }),
];

describe("ISimulator sözleşmesi", () => {
  it("tüm simülatörler deviceId + start/stop sağlar", () => {
    for (const sim of allSimulators()) {
      expect(sim.deviceId.length).toBeGreaterThan(0);
      expect(typeof sim.start).toBe("function");
      expect(typeof sim.stop).toBe("function");
    }
  });

  it("inject desteklemeyen simülatörde tanımsızdır", () => {
    const cb: ISimulator = new CbSimulator({ deviceId: "CB-1" });
    expect(cb.inject).toBeUndefined();
  });

  it("boş deviceId fail-fast", () => {
    expect(() => new CbSimulator({ deviceId: "" })).toThrow(/deviceId/);
  });
});
