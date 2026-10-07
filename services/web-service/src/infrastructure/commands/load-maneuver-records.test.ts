import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTierManeuverRecords } from "./load-maneuver-records";

const MANEUVER = (name: string) =>
  JSON.stringify({
    maneuvers: [
      { name, label: name, mode: "parallel", steps: [{ deviceTypes: ["pcs"], command: "start" }] },
    ],
  });

const OPERATION = (name: string) =>
  JSON.stringify({
    operations: [
      { name, label: name, mode: "sequential", steps: [{ maneuver: "foo" }] },
    ],
  });

let dir: string;

describe("loadTierManeuverRecords (SPEC T-41 / FR-10.1)", () => {
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "maneuver-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("demo dosyaları yokken yalnız mevcut katalog yüklenir (AK-10.7)", () => {
    writeFileSync(join(dir, "maneuvers.json"), MANEUVER("fl01_startup"));
    writeFileSync(join(dir, "operations.json"), OPERATION("field_charge"));
    const rec = loadTierManeuverRecords(dir);
    expect(rec.maneuvers.map((m) => m.name)).toEqual(["fl01_startup"]);
    expect(rec.operations.map((o) => o.name)).toEqual(["field_charge"]);
  });

  it("demo dosyaları mevcutsa eklemeli birleştirir (AK-10.1)", () => {
    writeFileSync(join(dir, "maneuvers.json"), MANEUVER("fl01_startup"));
    writeFileSync(join(dir, "demo-maneuvers.json"), MANEUVER("demo_charge"));
    writeFileSync(join(dir, "demo-operations.json"), OPERATION("demo_calibration"));
    const rec = loadTierManeuverRecords(dir);
    expect(rec.maneuvers.map((m) => m.name)).toEqual(["fl01_startup", "demo_charge"]);
    expect(rec.operations.map((o) => o.name)).toEqual(["demo_calibration"]);
  });

  it("bozuk demo dosyası fail-fast fırlatır", () => {
    writeFileSync(join(dir, "demo-maneuvers.json"), "{ bozuk");
    expect(() => loadTierManeuverRecords(dir)).toThrow();
  });

  it("hiçbir dosya yoksa boş döner", () => {
    const rec = loadTierManeuverRecords(dir);
    expect(rec).toEqual({ maneuvers: [], operations: [] });
  });
});
