// Sim-Lab başsız (Modbus'suz) fizik ve protokol testleri — bun test
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Plant, type SimLabConfig } from "./plant";

const appDir = join(import.meta.dir, "..");
const mk = (): Plant => {
  const cfg = JSON.parse(readFileSync(join(appDir, "simlab.config.json"), "utf-8")) as SimLabConfig;
  const p = new Plant(cfg, appDir);
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
  const b = p.bscs.get("BSC-1")!;
  const pcs = p.pcss.get("PCS-1")!;
  for (const h of p.hvacs.values()) h.write(0x202, 1);
  b.writeHolding(40010, 2);
  run(p, 20);
  b.writeHolding(40010, 5);
  run(p, 20);
  pcs.writeSetting(0x0e00, 1);
  pcs.writeSetting(0x0e14, 1);
  run(p, 20);
  pcs.writeSetting(0x0e19, (kw + 0x10000) & 0xffff);
  run(p, 30);
};

describe("BSC Rev AF", () => {
  test("Start → Normal, Close → 8 raf online", () => {
    const p = mk();
    const b = p.bscs.get("BSC-1")!;
    expect(b.state).toBe(1);
    b.writeHolding(40010, 2);
    run(p, 30);
    expect(b.state).toBe(3);
    expect(b.online.length).toBe(0);
    b.writeHolding(40010, 5);
    run(p, 20);
    expect(b.online.length).toBe(8);
    expect(b.busVoltage).toBeGreaterThan(1100);
    expect(b.busVoltage).toBeLessThan(1470);
  });

  test("Akım akarken Stop reddedilir (0x0A)", () => {
    const p = mk();
    startString(p, 800);
    const b = p.bscs.get("BSC-1")!;
    b.writeHolding(40010, 3);
    expect(b.ack).toBe(0x0a);
  });
});

describe("PCS ⇄ BSC enerji dengesi", () => {
  test("Deşarjda SOC düşer, akım PCS gücüyle tutarlı", () => {
    const p = mk();
    startString(p, 1000);
    const b = p.bscs.get("BSC-1")!;
    const pcs = p.pcss.get("PCS-1")!;
    expect(pcs.pAc).toBeGreaterThan(950);
    const soc0 = b.soc();
    run(p, 600);
    expect(b.soc()).toBeLessThan(soc0 - 4);
    // P_dc ≈ V × I (deşarjda BSC akımı negatif)
    const pDcKw = (-b.sectionCurrent * b.busVoltage) / 1000;
    expect(Math.abs(pDcKw - pcs.pDc)).toBeLessThan(60);
  });

  test("Şarj sonunda VPC limiti daraltır", () => {
    const p = mk();
    const b = p.bscs.get("BSC-1")!;
    for (const r of b.racks) r.setSoc(92);
    startString(p, -1600);
    run(p, 1800);
    expect(b.soc()).toBeGreaterThan(95);
    expect(b.limits.chargeKw).toBeLessThan(1600);
  });
});

describe("MC90 klima", () => {
  test("0 ile kapatma gerçek profilde reddedilir, 2 ile kapanır", () => {
    const p = mk();
    p.setProfile("gercek");
    const h = p.hvacs.get("HVAC-1")!;
    h.write(0x202, 1);
    expect(h.write(0x202, 0)).toBe(3); // 0x03 Illegal Data Value
    expect(h.remoteOn).toBe(true);
    h.write(0x202, 2);
    expect(h.remoteOn).toBe(false);
  });
});
