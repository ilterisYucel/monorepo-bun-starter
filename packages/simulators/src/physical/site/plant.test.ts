// Fiziksel saha simülatörü — Modbus'suz (süreç içi) fizik, protokol ve register testleri.
import { describe, expect, it } from "vitest";
import { join, resolve } from "node:path";
import { expandSite, normalizeSiteSpec, type SiteSpec } from "./site-config";
import { Plant } from "./plant";
import { BSC_STATE } from "../models/bsc";

const repoRoot = resolve(__dirname, "../../../../..");
const templatesDir = join(repoRoot, "configs");

const siteOf = (over: Partial<SiteSpec> = {}): SiteSpec =>
  normalizeSiteSpec({
    name: "test",
    templatesDir,
    containers: { count: 1, bscPerContainer: 2, racksPerBsc: 8, hvacPerContainer: 8, hvacZoneMap: "per-bus", aux: { cb: true, dcMeter: true, dcOutput: 2, pm5340: true, imd: true, fss: true, controlPanelIo: true } },
    mv: { stations: [{ id: "DEMO-MV-1", incomer: ["H01"], feeders: { H04: [1] } }] },
    ...over,
  } as SiteSpec);

const mk = (over: Partial<SiteSpec> = {}): Plant => {
  const p = new Plant(expandSite(siteOf(over), repoRoot));
  p.assist.heartbeat = true;
  p.assist.hvacServerTemps = true;
  return p;
};
const run = (p: Plant, seconds: number): void => {
  for (let t = 0; t < seconds; t += 10) {
    p.advance(10);
    (p as unknown as { runAssist(): void }).runAssist();
  }
};
const startString = (p: Plant, kw: number): void => {
  const b = p.bscs.get("C1.BSC-1")!;
  const pcs = p.pcss.get("PCS-1")!;
  for (const h of p.hvacs.values()) h.write(0x202, 1);
  b.writeHolding(40010, 2);
  run(p, 30);
  b.writeHolding(40010, 5);
  run(p, 20);
  pcs.writeSetting(0x0e00, 1);
  pcs.writeSetting(0x0e14, 1);
  run(p, 20);
  pcs.writeSetting(0x0e19, (kw + 0x10000) & 0xffff);
  run(p, 30);
};

describe("Saha üretimi (site spec → cihazlar)", () => {
  it("GD-1 şekli: 9 konteyner → 18 BSC, 18 PCS, 72 HVAC, benzersiz portlar", () => {
    const m = expandSite(siteOf({ containers: { ...siteOf().containers, count: 9 }, mv: { stations: [{ id: "DEMO-MV-1", incomer: ["H01"], feeders: { H04: [1, 2, 3, 4, 5], H05: [6, 7, 8, 9] } }] } }), repoRoot);
    const n = (t: string) => m.devices.filter((d) => d.type === t).length;
    expect(n("bsc")).toBe(18);
    expect(n("wattox-pcs")).toBe(18);
    expect(n("hvac")).toBe(72);
    const ports = m.devices.flatMap((d) => [d.port, d.bmsPort, d.connector?.port].filter((x) => x !== undefined));
    expect(new Set(ports).size).toBe(ports.length);
    expect(m.devices.find((d) => d.key === "PCS-12")!.feeder).toEqual({ station: "DEMO-MV-1", cell: "H05" });
    expect(m.devices.find((d) => d.key === "PCS-12")!.pair).toBe("C6.BSC-2");
  });

  it("register listesi kök configs'ten gelir; yalnız deviceId/name/connection değişir", () => {
    const m = expandSite(siteOf(), repoRoot);
    const h = m.devices.find((d) => d.key === "C1.HVAC-3")!;
    expect(h.config.deviceId).toBe("HVAC-3");
    expect(h.config.connection.port).toBe(h.port);
    expect(h.config.telemetry.some((t) => t.name === "Cooling Sensitivity" && t.registerAddress === 0x0c)).toBe(true);
    expect((h.config as unknown as { transport?: unknown }).transport).toBeUndefined();
  });

  it("HVAC zon eşlemesi per-bus: bara başına 4 klima, her klima 2 raf", () => {
    const m = expandSite(siteOf(), repoRoot);
    expect(m.zones.get("C1.HVAC-3")).toEqual([{ bsc: "C1.BSC-1", rack: 5 }, { bsc: "C1.BSC-1", rack: 6 }]);
    expect(m.zones.get("C1.HVAC-5")).toEqual([{ bsc: "C1.BSC-2", rack: 1 }, { bsc: "C1.BSC-2", rack: 2 }]);
  });

  it("BSC→PCS eşleme dosyası her BSC için kendi deviceId'sine çevrilir", () => {
    const m = expandSite(siteOf(), repoRoot);
    const map = JSON.stringify(m.mappings.get("C1.BSC-1"));
    expect(map).toContain('"deviceId":"BSC-1"');
    expect(map).not.toContain('"deviceId":"BSC-2"');
  });

  it("geçersiz spec reddedilir", () => {
    expect(() => normalizeSiteSpec({ name: "x", containers: { count: 0 } } as never)).toThrow();
  });
});

describe("Seçici", () => {
  it("glob, type:, container:, deviceId", () => {
    const p = mk();
    expect(p.select("C1.HVAC-*")).toHaveLength(8);
    expect(p.select("type:wattox-pcs")).toEqual(["PCS-1", "PCS-2"]);
    expect(p.select("BSC-2")).toEqual(["C1.BSC-2"]);
    expect(p.select("container:1").length).toBeGreaterThan(20);
    expect(p.select("C1.HVAC-1, PCS-2")).toEqual(["C1.HVAC-1", "PCS-2"]);
  });
});

describe("BSC Rev AF + SW Manual RevAH", () => {
  it("Start → In Progress → Initializing → Done; raflar hazır olunca Normal; Close → 8 raf online", () => {
    const p = mk();
    const b = p.bscs.get("C1.BSC-1")!;
    expect(b.state).toBe(BSC_STATE.NOT_INITIALIZED);
    b.writeHolding(40010, 2);
    expect(b.ack).toBe(1);
    expect(b.state).toBe(BSC_STATE.INITIALIZING);
    run(p, 30);
    expect(b.state).toBe(BSC_STATE.NORMAL);
    expect(b.online.length).toBe(0);
    b.writeHolding(40010, 5);
    run(p, 20);
    expect(b.online.length).toBe(8);
    expect(b.busVoltage).toBeGreaterThan(1100);
    expect(b.busVoltage).toBeLessThan(1470);
  });

  it("Akım akarken Stop reddedilir (0x0A Current Flows)", () => {
    const p = mk();
    startString(p, 800);
    const b = p.bscs.get("C1.BSC-1")!;
    b.writeHolding(40010, 3);
    expect(b.ack).toBe(0x0a);
  });

  it("Initializing sırasında Stop kabul edilir → Not Initialized (geçiş #2)", () => {
    const p = mk();
    const b = p.bscs.get("C1.BSC-1")!;
    b.writeHolding(40010, 2);
    run(p, 2);
    b.writeHolding(40010, 3);
    expect(b.state).toBe(BSC_STATE.NOT_INITIALIZED);
  });

  it("Emergency yalnız Stop/Reset ile çıkar; Start → 0x06 BMS Already Connected", () => {
    const p = mk();
    const b = p.bscs.get("C1.BSC-1")!;
    b.writeHolding(40010, 2);
    run(p, 30);
    b.writeHolding(40010, 1);
    expect(b.state).toBe(BSC_STATE.EMERGENCY);
    b.writeHolding(40010, 2);
    expect(b.ack).toBe(0x06);
    b.writeHolding(40010, 3);
    expect(b.state).toBe(BSC_STATE.NOT_INITIALIZED);
  });
});

describe("PCS ⇄ BSC enerji dengesi", () => {
  it("Deşarjda SOC düşer, DC güç PCS DC gücüyle tutarlı", () => {
    const p = mk();
    startString(p, 1000);
    const b = p.bscs.get("C1.BSC-1")!;
    const pcs = p.pcss.get("PCS-1")!;
    expect(pcs.pAc).toBeGreaterThan(950);
    const soc0 = b.soc();
    run(p, 600);
    expect(b.soc()).toBeLessThan(soc0 - 4);
    const pDcKw = (-b.sectionCurrent * b.busVoltage) / 1000;
    expect(Math.abs(pDcKw - pcs.pDc)).toBeLessThan(60);
  });

  it("OG fider H04 açılınca PCS şebekeyi kaybeder ve fault'a düşer", () => {
    const p = mk();
    startString(p, 600);
    const mv = p.legacySim<{ writeCoil(a: number, v: boolean): void }>("DEMO-MV-1")!;
    mv.writeCoil(4, true); // H04 aç
    run(p, 10);
    expect(p.pcss.get("PCS-1")!.opStatus).toBe(6);
  });
});

describe("MC90 klima", () => {
  it("0 ile kapatma gerçek profilde reddedilir, 2 ile kapanır", () => {
    const p = mk();
    p.setProfile("gercek");
    const h = p.hvacs.get("C1.HVAC-1")!;
    h.write(0x202, 1);
    expect(h.write(0x202, 0)).toBe(3);
    expect(h.remoteOn).toBe(true);
    h.write(0x202, 2);
    expect(h.remoteOn).toBe(false);
  });
});

describe("Register üstyazımı / toplu / seri", () => {
  it("hold: EMS yanıtı değişir, model değişmez; release ile geri döner", async () => {
    const p = mk();
    const before = await p.readPoint("C1.HVAC-2", "Current Temp");
    await p.applyPoint("C1.HVAC-2", "Current Temp", 41.5, "hold", "test");
    const held = await p.readPoint("C1.HVAC-2", "Current Temp");
    expect(held.value).toBeCloseTo(41.5, 5);
    expect(held.overridden).toBe(true);
    expect(p.zones.get("C1.HVAC-2")!.airT).toBeLessThan(30);
    await p.applyPoint("C1.HVAC-2", "Current Temp", null, "clear", "test");
    expect((await p.readPoint("C1.HVAC-2", "Current Temp")).value).toBeCloseTo(before.value, 0);
  });

  it("bitfield hold yalnız kendi bitini değiştirir", async () => {
    const p = mk();
    await p.applyPoint("PCS-1", "Cabinet door fault", 1, "hold", "test");
    const w = await p.readPoint("PCS-1", "holding:12219"); // Fault word 7 (0x2FBB)
    expect((w.words[0]! >> 9) & 1).toBe(1);
  });

  it("write: EMS gibi yazılır, cihaz mantığı tepki verir (BSC Start)", async () => {
    const p = mk();
    await p.applyPoint("C1.BSC-2", "Command Request", 2, "write", "test");
    expect(p.bscs.get("C1.BSC-2")!.state).toBe(BSC_STATE.INITIALIZING);
  });

  it("toplu: tüm klimaların soğutma setpoint'i tek işlemde", async () => {
    const p = mk();
    const res = await p.applyBulk("C*.HVAC-*", "Cooling Setpoint", 21.5, "write", "test");
    expect(res.every((r) => r.ok)).toBe(true);
    for (const h of p.hvacs.values()) expect(h.coolSet()).toBeCloseTo(21.5, 5);
  });

  it("süreli hold kendiliğinden kalkar", async () => {
    const p = mk();
    await p.applyPoint("PCS-2", "Battery Voltage", 900, "hold", "test", 5);
    expect(p.device("PCS-2").overlay.size()).toBe(1);
    p.advance(6);
    expect(p.device("PCS-2").overlay.size()).toBe(0);
  });

  it("seri: doğrusal rampa ara değer üretir ve birden çok hedefe uygulanır", async () => {
    const p = mk();
    p.series.start(
      {
        id: "s",
        name: "rampa",
        timeBase: "sim",
        interp: "linear",
        loop: false,
        rows: [
          { t: 0, target: "C1.HVAC-1,C1.HVAC-2", point: "Outside Temp", value: 20, mode: "hold" },
          { t: 100, target: "C1.HVAC-1,C1.HVAC-2", point: "Outside Temp", value: 40, mode: "hold" },
        ],
      },
      p.simT,
    );
    p.advance(50);
    const a = await p.readPoint("C1.HVAC-1", "Outside Temp");
    const b = await p.readPoint("C1.HVAC-2", "Outside Temp");
    expect(a.value).toBeGreaterThan(28);
    expect(a.value).toBeLessThan(32);
    expect(b.value).toBeCloseTo(a.value, 5);
    p.advance(60);
    expect((await p.readPoint("C1.HVAC-1", "Outside Temp")).value).toBeCloseTo(40, 5);
    expect(p.series.status()).toBeNull();
  });
});
