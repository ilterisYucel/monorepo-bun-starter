// demo-v2 saha dosyası — v2 stack cihaz anahtarları ve Sim-Lab port şeması (SPEC UC-3, AK-3.1).
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { expandSite, loadSiteSpec } from "./site-config";

/** Repo kökü — `configs/` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(join(dir, "configs")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};

const repoRoot = findRepoRoot(__dirname);
const siteFile = join(repoRoot, "deployment/v2/dev/simulator-app/sites/demo-v2.site.json");
const { spec, baseDir } = loadSiteSpec(siteFile);
const model = expandSite(spec, baseDir);
const portOf = (key: string): number | undefined => model.devices.find((d) => d.key === key)?.port;

describe("demo-v2.site.json — v2 cihaz kümesi ve port şeması", () => {
  it("AK-3.1: iki konteyner × 20 cihaz + 4 PCS + 2 OG istasyonu üretir", () => {
    const keys = model.devices.map((d) => d.key);
    for (const key of [
      "C1.BSC-1", "C1.BSC-2", "C1.HVAC-1", "C1.HVAC-8", "C1.CB-1", "C1.CB-2",
      "C1.DC-METER-1", "C1.DC-1", "C1.DC-2", "C1.PM5340-1", "C1.IMD-1", "C1.FSS-1",
      "C1.CONTROL-PANEL-IO-1",
    ]) {
      expect(keys, key).toContain(key);
    }
    for (const key of ["C2.BSC-1", "C2.HVAC-8", "C2.IMD-1", "C2.CONTROL-PANEL-IO-1"]) {
      expect(keys, key).toContain(key);
    }
    for (const key of ["PCS-1", "PCS-2", "PCS-3", "PCS-4", "DEMO-MV-1", "DEMO-MV-2"]) {
      expect(keys, key).toContain(key);
    }
  });

  it("AK-3.1: portlar Sim-Lab şemasıyla birebir (2000x/2010x/3000x/3020x)", () => {
    expect(portOf("C1.BSC-1")).toBe(20001);
    expect(portOf("C1.BSC-2")).toBe(20002);
    expect(portOf("C1.HVAC-8")).toBe(20018);
    expect(portOf("C1.CB-2")).toBe(20032);
    expect(portOf("C1.DC-METER-1")).toBe(20041);
    expect(portOf("C1.PM5340-1")).toBe(20051);
    expect(portOf("C1.IMD-1")).toBe(20052);
    expect(portOf("C1.FSS-1")).toBe(20053);
    expect(portOf("C1.CONTROL-PANEL-IO-1")).toBe(20054);
    expect(portOf("C2.BSC-1")).toBe(20101);
    expect(portOf("C2.HVAC-8")).toBe(20118);
    expect(portOf("C2.CONTROL-PANEL-IO-1")).toBe(20154);
    expect(portOf("PCS-1")).toBe(30001);
    expect(portOf("PCS-4")).toBe(30004);
    expect(portOf("DEMO-MV-1")).toBe(30201);
    expect(portOf("DEMO-MV-2")).toBe(30202);
  });

  it("AK-3.1: PCS ↔ BSC eşleşmesi ve fider üyeliği doğru", () => {
    expect(model.devices.find((d) => d.key === "PCS-1")?.pair).toBe("C1.BSC-1");
    expect(model.devices.find((d) => d.key === "PCS-3")?.pair).toBe("C2.BSC-1");
    expect(model.devices.find((d) => d.key === "PCS-4")?.feeder).toEqual({ station: "DEMO-MV-2", cell: "H05" });
  });
});
