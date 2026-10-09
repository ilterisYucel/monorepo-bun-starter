import { describe, it, expect } from "vitest";
import { compareDeviceConfig } from "./device-config-drift";
import type { DriftConfigLike } from "./device-config-drift";

const root: DriftConfigLike = {
  deviceId: "BSC-1",
  type: "bsc",
  telemetry: [
    { name: "SOC", registerTableType: "INPUT_REGISTER", registerAddress: 30055 },
    { name: "SOH", registerTableType: "INPUT_REGISTER", registerAddress: 30056 },
  ],
  bitfieldConfigs: [
    { registerAddress: 30221, fields: [{ name: "Fault" }, { name: "Warning" }] },
  ],
};

const copy = (overrides: Partial<DriftConfigLike> = {}): DriftConfigLike => ({
  deviceId: "BSC-9",
  type: "bsc",
  telemetry: [
    { name: "SOC", registerTableType: "INPUT_REGISTER", registerAddress: 30055 },
    { name: "SOH", registerTableType: "INPUT_REGISTER", registerAddress: 30056 },
  ],
  bitfieldConfigs: [
    { registerAddress: 30221, fields: [{ name: "Fault" }, { name: "Warning" }] },
  ],
  ...overrides,
});

describe("compareDeviceConfig", () => {
  it("özdeş config → issue yok", () => {
    expect(compareDeviceConfig(root, copy())).toEqual([]);
  });

  it("kopyada eksik telemetri → error (missing)", () => {
    const issues = compareDeviceConfig(
      root,
      copy({ telemetry: [root.telemetry![0]!] }),
    );
    expect(issues).toEqual([
      {
        level: "error",
        deviceId: "BSC-9",
        rootType: "bsc",
        kind: "missing",
        key: "INPUT_REGISTER:30056:SOH",
      },
    ]);
  });

  it("kopyada fazla telemetri → allowlist'siz error (extra)", () => {
    const issues = compareDeviceConfig(
      root,
      copy({
        telemetry: [
          ...root.telemetry!,
          { name: "Charge Power Setpoint", registerTableType: "HOLDING_REGISTER", registerAddress: 40030 },
        ],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", kind: "extra" });
  });

  it("allowlist'li fazla telemetri → warn (izinli demo eki)", () => {
    const issues = compareDeviceConfig(
      root,
      copy({
        telemetry: [
          ...root.telemetry!,
          { name: "Charge Power Setpoint", registerTableType: "HOLDING_REGISTER", registerAddress: 40030 },
        ],
      }),
      { bsc: ["Charge Power Setpoint"] },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "warn", kind: "extra" });
  });

  it("bitfield eksik/extra yakalanır (isim bazlı)", () => {
    const issues = compareDeviceConfig(root, copy({
      bitfieldConfigs: [
        { registerAddress: 30221, fields: [{ name: "Fault" }, { name: "Extra" }] },
      ],
    }));
    expect(issues.map((i) => i.key).sort()).toEqual([
      "BF:30221:Extra",
      "BF:30221:Warning",
    ]);
  });

  it("aynı isim çoklu bitfield (rack) → multiset eşleşir", () => {
    const r: DriftConfigLike = {
      deviceId: "BSC-1", type: "bsc",
      bitfieldConfigs: [
        { registerAddress: 1, fields: [{ name: "Fault" }] },
        { registerAddress: 2, fields: [{ name: "Fault" }] },
      ],
    };
    const c: DriftConfigLike = {
      deviceId: "BSC-2", type: "bsc",
      bitfieldConfigs: [
        { registerAddress: 1, fields: [{ name: "Fault" }] },
        { registerAddress: 2, fields: [{ name: "Fault" }] },
      ],
    };
    expect(compareDeviceConfig(r, c)).toEqual([]);
  });

  it("connection/deviceId/name farkı sapma SAYILMAZ", () => {
    expect(compareDeviceConfig(root, copy({ deviceId: "BSC-99" }))).toEqual([]);
  });
});
