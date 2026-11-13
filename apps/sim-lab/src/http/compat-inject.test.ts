// Uyumluluk ucu (compat-inject) kanıtları — SPEC DEVICE-SERVICE-SADELESTIRME UC-4.
// AK-4.1 eski sözleşme (kapsam/cihaz/yanıt) · AK-4.2 senaryo → gözlemlenebilir eylem.
import { describe, expect, it } from "vitest";
import { compatInject, type CompatFaults, type CompatPlant } from "./compat-inject";

interface BulkCall {
  selector: string;
  ref: string;
  value: number | null;
  mode: "clear" | "hold";
}

const fakePlant = (types: Record<string, string>): CompatPlant & { calls: BulkCall[] } => {
  const calls: BulkCall[] = [];
  return {
    calls,
    devices: new Map(Object.entries(types).map(([key, type]) => [key, { type }])),
    async applyBulk(selector, ref, value, mode, _source, _durationS) {
      calls.push({ selector, ref, value, mode });
      return [];
    },
  };
};

const fakeFaults = (active: Array<{ uid: number; target: string }> = []) => {
  const injected: Array<{ defId: string; selector: string; params?: Record<string, unknown> }> = [];
  const faults: CompatFaults & { injected: typeof injected; activeList: typeof active } = {
    active,
    injected,
    activeList: active,
    injectMany(defId, selector, params) {
      injected.push({ defId, selector, ...(params !== undefined ? { params } : {}) });
      return [{ ok: true }];
    },
    clear(uid) {
      const i = active.findIndex((a) => a.uid === uid);
      if (i >= 0) active.splice(i, 1);
    },
  };
  return faults;
};

describe("compatInject", () => {
  it("AK-4.1: bilinmeyen kapsam/cihaz reddedilir (uygulanmadı)", async () => {
    const p = fakePlant({ "C1.BSC-1": "bsc" });
    const fm = fakeFaults();
    expect((await compatInject(p, fm, "c9", "BSC-1", "fault")).applied).toBe(false);
    expect((await compatInject(p, fm, "c1", "BSC-9", "fault")).applied).toBe(false);
    expect((await compatInject(p, fm, "c1", "BSC-1", "bilinmeyen")).applied).toBe(false);
  });

  it("AK-4.1: kapsam öneki cihaz anahtarına çevrilir (c2 → C2., field → ön ek yok)", async () => {
    const p = fakePlant({ "C2.IMD-1": "imd", "PCS-1": "pcs" });
    const fm = fakeFaults();
    expect((await compatInject(p, fm, "c2", "IMD-1", "fault")).applied).toBe(true);
    expect(fm.injected.at(-1)).toMatchObject({ defId: "imd.fault", selector: "C2.IMD-1" });
    expect((await compatInject(p, fm, "field", "PCS-1", "fault")).applied).toBe(true);
    expect(fm.injected.at(-1)).toMatchObject({ defId: "pcs.faultBit", selector: "PCS-1" });
  });

  it("AK-4.4: nominal tüm üstyazımları ve cihaz arızalarını temizler", async () => {
    const p = fakePlant({ "C1.BSC-1": "bsc" });
    const fm = fakeFaults([
      { uid: 1, target: "C1.BSC-1" },
      { uid: 2, target: "C1.BSC-1/R3" },
      { uid: 3, target: "C1.BSC-2" },
    ]);
    expect((await compatInject(p, fm, "c1", "BSC-1", "nominal")).applied).toBe(true);
    expect(p.calls).toEqual([{ selector: "C1.BSC-1", ref: "*", value: null, mode: "clear" }]);
    expect(fm.active.map((a) => a.uid)).toEqual([3]);
  });

  it("AK-4.3: soc:<n> raf SOC enjeksiyonuna çevrilir", async () => {
    const p = fakePlant({ "C1.BSC-1": "bsc" });
    const fm = fakeFaults();
    expect((await compatInject(p, fm, "c1", "BSC-1", "soc:42")).applied).toBe(true);
    expect(fm.injected.at(-1)).toMatchObject({ defId: "rack.setSoc", selector: "C1.BSC-1", params: { soc: 42 } });
    expect((await compatInject(p, fm, "c1", "BSC-1", "soc:x")).applied).toBe(false);
  });

  it("AK-4.3: kapı/yangın senaryoları IO eşlemesine gider", async () => {
    const p = fakePlant({ "C1.CONTROL-PANEL-IO-1": "control-panel-io" });
    const fm = fakeFaults();
    await compatInject(p, fm, "c1", "CONTROL-PANEL-IO-1", "battery_door_open");
    expect(fm.injected.at(-1)).toMatchObject({ defId: "io.door", params: { which: "battery" } });
    await compatInject(p, fm, "c1", "CONTROL-PANEL-IO-1", "fire");
    // Yangın DI'si kontrol panelinin kendi Fire bitidir (FSS paneli değil).
    expect(fm.injected.at(-1)).toMatchObject({ defId: "io.fire" });
    await compatInject(p, fm, "c1", "CONTROL-PANEL-IO-1", "battery_door_close");
    expect(p.calls.at(-1)).toMatchObject({ selector: "C1.CONTROL-PANEL-IO-1", mode: "clear" });
  });

  it("AK-4.3: HVAC sıcak/soğuk/nem noktada hold üretir", async () => {
    const p = fakePlant({ "C1.HVAC-1": "hvac" });
    const fm = fakeFaults();
    await compatInject(p, fm, "c1", "HVAC-1", "hot");
    expect(p.calls.at(-1)).toEqual({ selector: "C1.HVAC-1", ref: "Current Temp", value: 45, mode: "hold" });
    await compatInject(p, fm, "c1", "HVAC-1", "cold");
    expect(p.calls.at(-1)).toEqual({ selector: "C1.HVAC-1", ref: "Current Temp", value: 5, mode: "hold" });
    await compatInject(p, fm, "c1", "HVAC-1", "humid");
    expect(p.calls.at(-1)).toEqual({ selector: "C1.HVAC-1", ref: "Return Humidity", value: 90, mode: "hold" });
  });

  it("AK-4.3: aux_loss gerilim noktalarını 0'a çeker", async () => {
    const p = fakePlant({ "C1.PM5340-1": "energy-analyzer" });
    const fm = fakeFaults();
    expect((await compatInject(p, fm, "c1", "PM5340-1", "aux_loss")).applied).toBe(true);
    // Kural `Voltage L-N Avg` okur → ortalama da 0'a çekilir.
    expect(p.calls.map((c) => c.ref)).toEqual([
      "Voltage L-N A",
      "Voltage L-N B",
      "Voltage L-N C",
      "Voltage L-N Avg",
    ]);
    expect(p.calls.every((c) => c.value === 0 && c.mode === "hold")).toBe(true);
  });

  it("yanlış cihaz tipinde senaryo uygulanmaz", async () => {
    const p = fakePlant({ "C1.BSC-1": "bsc" });
    const fm = fakeFaults();
    expect((await compatInject(p, fm, "c1", "BSC-1", "hot")).applied).toBe(false);
    expect((await compatInject(p, fm, "c1", "BSC-1", "aux_loss")).applied).toBe(false);
  });
});

describe("compatInject — tip eşlemeleri ve hata yolları", () => {
  const types = {
    "C1.BSC-1": "bsc",
    "C1.IMD-1": "imd",
    "C1.PCS-1": "pcs",
    "C1.DC-METER-1": "dc-meter",
    "C1.HVAC-1": "hvac",
    "C1.CONTROL-PANEL-IO-1": "control-panel-io",
    "C1.FSS-1": "fss",
    "C1.CB-1": "cb",
    "C1.MYSTERY-1": "mystery",
    "C1.WATTOX-1": "wattox-pcs",
  };

  it("cihaz tipine göre 'fault' eşlemesi doğru arıza tanımına gider", async () => {
    const p = fakePlant(types);
    const fm = fakeFaults();
    const expected: Array<[string, string]> = [
      ["BSC-1", "bsc.forceDiag"],
      ["PCS-1", "pcs.faultBit"],
      ["WATTOX-1", "pcs.faultBit"],
      ["DC-METER-1", "dcmeter.alarm"],
      ["HVAC-1", "hvac.powerLoss"],
      ["CONTROL-PANEL-IO-1", "io.fss"],
      ["FSS-1", "fss.panelFault"],
      ["CB-1", "cb.trip"],
    ];
    for (const [deviceId, defId] of expected) {
      expect((await compatInject(p, fm, "c1", deviceId, "fault")).applied, deviceId).toBe(true);
      expect(fm.injected.at(-1)?.defId).toBe(defId);
    }
    expect((await compatInject(p, fm, "c1", "MYSTERY-1", "fault")).applied).toBe(false);
  });

  it("'warning' PCS'te alarm biti, diğerlerinde tip arızası; bilinmeyen tipte reddedilir", async () => {
    const p = fakePlant(types);
    const fm = fakeFaults();
    await compatInject(p, fm, "c1", "PCS-1", "warning");
    expect(fm.injected.at(-1)?.defId).toBe("pcs.alarmBit");
    await compatInject(p, fm, "c1", "IMD-1", "warning"); // ön uyarı (200 kΩ)
    expect(fm.injected.at(-1)?.defId).toBe("imd.prewarning");
    expect((await compatInject(p, fm, "c1", "MYSTERY-1", "warning")).applied).toBe(false);
    await compatInject(p, fm, "c1", "BSC-1", "warning");
    expect(fm.injected.at(-1)?.defId).toBe("bsc.forceDiag");
  });

  it("cihaz-özel senaryolar (overheat/diff_temp/overcurrent/overvoltage/door_open)", async () => {
    const p = fakePlant(types);
    const fm = fakeFaults();
    const expected: Array<[string, string, string]> = [
      ["BSC-1", "overheat", "rack.hotspot"],
      ["BSC-1", "diff_temp", "rack.tempSensor"],
      ["DC-METER-1", "overcurrent", "dcmeter.overcurrent"],
      ["DC-METER-1", "overvoltage", "dcmeter.alarm"],
      ["PCS-1", "door_open", "pcs.door"],
    ];
    for (const [deviceId, scenario, defId] of expected) {
      expect((await compatInject(p, fm, "c1", deviceId, scenario)).applied, scenario).toBe(true);
      expect(fm.injected.at(-1)?.defId).toBe(defId);
    }
  });

  it("first_stage ve panel_door_open eşlemeleri", async () => {
    const p = fakePlant(types);
    const fm = fakeFaults();
    await compatInject(p, fm, "c1", "CONTROL-PANEL-IO-1", "first_stage");
    expect(fm.injected.at(-1)).toMatchObject({ defId: "io.fss", params: { state: "secondStage" } });
    await compatInject(p, fm, "c1", "CONTROL-PANEL-IO-1", "panel_door_open");
    expect(fm.injected.at(-1)).toMatchObject({ defId: "io.door", params: { which: "panel" } });
  });

  it("boş deviceId/scenario ve bilinmeyen senaryo hata mesajıyla reddedilir", async () => {
    const p = fakePlant(types);
    const fm = fakeFaults();
    expect(await compatInject(p, fm, "c1", "", "fault")).toMatchObject({ applied: false, error: "deviceId ve scenario zorunlu" });
    expect(await compatInject(p, fm, "c1", "BSC-1", "")).toMatchObject({ applied: false, error: "deviceId ve scenario zorunlu" });
    expect(await compatInject(p, fm, "yok", "BSC-1", "fault")).toMatchObject({ applied: false, error: "bilinmeyen kapsam: yok" });
    expect(await compatInject(p, fm, "c1", "BSC-X", "fault")).toMatchObject({ applied: false, error: "cihaz yok: C1.BSC-X" });
    expect(await compatInject(p, fm, "c1", "BSC-1", "zzz")).toMatchObject({ applied: false, error: "bilinmeyen senaryo: zzz" });
  });

  it("enjeksiyon başarısızsa applied=false ve hata döner", async () => {
    const p = fakePlant(types);
    const fm: CompatFaults = {
      active: [],
      injectMany: () => [{ ok: false, error: "hedef yok" }],
      clear: () => undefined,
    };
    expect(await compatInject(p, fm, "c1", "BSC-1", "fault")).toMatchObject({ applied: false, error: "hedef yok" });
  });
});
