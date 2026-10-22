import { describe, it, expect } from "vitest";
import { BSCSimulator } from "./bsc-simulator";
import {
  ESSENTIAL,
  COMMAND,
  CONTROLLER,
  BSC_STATE,
  BSC_INFO_BITS,
  NAMEPLATE,
  ACKNOWLEDGE,
  RACK_SUMMARY_BASE,
  RACK_STRIDE,
  RACK_SUMMARY,
  SYSTEM_SUMMARY,
  RACK_NAMEPLATE,
  RACK_NAMEPLATE_BASE,
} from "./register-map";

/**
 * BSCSimulator sözleşmesi (2026-08-30 — T4 karakterizasyonu; TEİAŞ #22):
 * - Otomatik init: 3 tick → INITIALIZING; 6 tick → NORMAL (30036).
 * - START + dış güç girdisi (negatif=şarj) → 30037 charge status 0b01; pozitif=deşarj → 0b10 (0x000B yok).
 * - EMERGENCY → durum EMERGENCY (30036).
 * - Deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01).
 *
 * NOT (ack kaydı): komut yazımı anında `acknowledge=DONE` register'a yazılır
 * ve bun runtime'ında yazımdan hemen sonra okunabilir (`bun -e` ile kanıt).
 * Vitest (node) ortamında aynı okuma 0 döndürüyor — ortam farkı ayrıca
 * araştırılacak; ack davranışı bu dosyada iddia edilmez.
 */

function makeReadySim(soc = 50): BSCSimulator {
  const sim = new BSCSimulator({ deviceId: "BSC-1", rackCount: 2, registers: [], initialSocPercent: soc });
  for (let i = 0; i < 7; i++) sim.tick(1);
  return sim;
}

/** Taze sim — NOT_INITIALIZED (Start'ın kabul edildiği tek durum). */
function freshSim(soc = 50): BSCSimulator {
  return new BSCSimulator({ deviceId: "BSC-1", rackCount: 2, registers: [], initialSocPercent: soc });
}

describe("BSCSimulator (T4)", () => {
  it("otomatik init: 6 tick sonrası NORMAL duruma geçer", () => {
    const sim = new BSCSimulator({ deviceId: "BSC-1", rackCount: 2, registers: [], initialSocPercent: 80 });
    for (let i = 0; i < 7; i++) sim.tick(1);
    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.NORMAL);
  });

  it("START komutu → charge status bitleri (BSC_INFO 30037)", () => {
    const sim = freshSim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50); // şarj (PCS S06 negatif)
    sim.tick(1);

    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b01);
  });

  it("START + demo deşarj setpoint → discharge status bitleri (BSC_INFO 30037)", () => {
    const sim = makeReadySim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START); // yön dış güçten (0x000B yok)
    sim.applyPowerKw(50);
    sim.tick(1);

    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b10);
  });

  it("SIM-1: komut kutusu (40010) 0'a yazılsa da yürütme latch'lenir (şarj sürer)", () => {
    const sim = freshSim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50);
    // El sıkışma finalize: komut kutusu temizlenir.
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.NONE);
    sim.tick(1);

    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b01);
  });

  it("C1: akım akarken STOP 'Current Flows' (0x000A) ile reddedilir; şarj sürer", () => {
    const sim = freshSim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50);
    sim.tick(1);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.STOP);

    expect(sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE)).toBe(ACKNOWLEDGE.CURRENT_FLOWS);
    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b01); // hâlâ şarj
  });

  it("C1: setpoint sıfırlanınca STOP kabul edilir (DONE)", () => {
    const sim = freshSim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50);
    sim.applyPowerKw(0);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.STOP);

    expect(sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE)).toBe(ACKNOWLEDGE.DONE);
    const info = sim.readInputRegister(ESSENTIAL.BSC_INFO);
    expect((info >> BSC_INFO_BITS.CHARGE_STATUS) & 0b11).toBe(0b11); // idle
  });

  it("C2: akım akarken OPEN_ALL reddedilir; EMERGENCY kabul edilir (en yüksek öncelik)", () => {
    const sim = freshSim(50);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50);
    sim.tick(1);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.OPEN_ALL_CONTACTORS);
    expect(sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE)).toBe(ACKNOWLEDGE.CURRENT_FLOWS);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EMERGENCY);
    expect(sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE)).toBe(ACKNOWLEDGE.DONE);
    sim.tick(1);
    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.EMERGENCY);
  });

  it("EMERGENCY komutu durumu EMERGENCY'ye geçirir", () => {
    const sim = makeReadySim(80);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EMERGENCY);
    sim.tick(1);

    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.EMERGENCY);
  });

  it("deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01)", () => {
    const sim = makeReadySim(0);

    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START); // yön dış güçten (0x000B yok)
    sim.applyPowerKw(50);
    for (let i = 0; i < 50; i++) sim.tick(60);

    for (const rackId of [1, 2]) {
      const base = RACK_SUMMARY_BASE + (rackId - 1) * RACK_STRIDE;
      const socRaw = sim.readInputRegister(base + RACK_SUMMARY.SOC);
      expect(socRaw).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("BSCSimulator SOC limitleri (97 / 3,5)", () => {
  it("şarjda SOC %97'yi aşamaz (clamp)", () => {
    const sim = freshSim(96);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50); // şarj (PCS S06 negatif)
    for (let i = 0; i < 200; i++) sim.tick(60);
    const socRaw = sim.readInputRegister(SYSTEM_SUMMARY.BSC_SOC); // scale 0.01 → 9700 = %97
    expect(socRaw).toBeGreaterThanOrEqual(9600);
    expect(socRaw).toBeLessThanOrEqual(9700);
  });

  it("deşarjda SOC %3,5'in altına inemez (clamp)", () => {
    const sim = makeReadySim(5);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START); // yön dış güçten (0x000B yok)
    sim.applyPowerKw(50);
    for (let i = 0; i < 200; i++) sim.tick(60);
    const socRaw = sim.readInputRegister(SYSTEM_SUMMARY.BSC_SOC);
    expect(socRaw).toBeLessThanOrEqual(500);
    expect(socRaw).toBeGreaterThanOrEqual(350); // %3,5
  });
});

describe("BSCSimulator — request-ack tablosu (Sequence/Diagnosis)", () => {
  const req = (sim: BSCSimulator) => sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE);

  it("Start Normal'de → BMS Already Connected (0x06)", () => {
    const sim = makeReadySim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    expect(req(sim)).toBe(ACKNOWLEDGE.BMS_ALREADY_CONNECTED);
  });

  it("Initializing'de komut → Under Initializing (0x07)", () => {
    const sim = freshSim(50);
    for (let i = 0; i < 3; i++) sim.tick(1); // INITIALIZING
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.CLOSE_CONTACTORS);
    expect(req(sim)).toBe(ACKNOWLEDGE.UNDER_INITIALIZING);
  });

  it("Emergency'den yalnız Stop çıkar → Not Initialized", () => {
    const sim = freshSim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EMERGENCY);
    expect(req(sim)).toBe(ACKNOWLEDGE.DONE);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.STOP);
    expect(req(sim)).toBe(ACKNOWLEDGE.DONE);
    expect(sim.readInputRegister(ESSENTIAL.BSC_STATE)).toBe(BSC_STATE.NOT_INITIALIZED);
  });

  it("Event Clear 30 s cooldown → ikinci kez Within Cooldown (0x12)", () => {
    const sim = makeReadySim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EVENT_CLEAR);
    expect(req(sim)).toBe(ACKNOWLEDGE.DONE);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.EVENT_CLEAR);
    expect(req(sim)).toBe(ACKNOWLEDGE.WITHIN_COOLDOWN);
  });

  it("Open All zaten açık → Contactors Already Open (0x08)", () => {
    const sim = freshSim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(0); // akım yok
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.OPEN_ALL_CONTACTORS);
    expect(req(sim)).toBe(ACKNOWLEDGE.DONE);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.OPEN_ALL_CONTACTORS);
    expect(req(sim)).toBe(ACKNOWLEDGE.CONTACTORS_ALREADY_OPEN);
  });

  it("Close zaten online → BSC Already Online (0x09)", () => {
    const sim = freshSim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.CLOSE_CONTACTORS);
    expect(req(sim)).toBe(ACKNOWLEDGE.BSC_ALREADY_ONLINE);
  });

  it("Reset akım akarken → Current Flows (0x0A)", () => {
    const sim = freshSim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(-50);
    sim.tick(1);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.RESET);
    expect(req(sim)).toBe(ACKNOWLEDGE.CURRENT_FLOWS);
  });
});

describe("BSCSimulator — rack nameplate değerleri (hardware.md)", () => {
  it("17 pack / 2 BMIC / 4 sıcaklık / 24 hücre / 210 A relay", () => {
    const sim = freshSim(50);
    const base = RACK_NAMEPLATE_BASE; // R1
    const rd = (off: number) => sim.readInputRegister(base + off);
    expect(rd(RACK_NAMEPLATE.PACK_COUNT)).toBe(17);
    expect(rd(RACK_NAMEPLATE.BMIC_COUNT)).toBe(2);
    expect(rd(RACK_NAMEPLATE.TEMP_SENSOR_COUNT)).toBe(4);
    expect(rd(RACK_NAMEPLATE.PCB_TEMP_SENSOR_COUNT)).toBe(2);
    expect(rd(RACK_NAMEPLATE.VOLTAGE_SENSOR_COUNT)).toBe(24);
    expect(rd(RACK_NAMEPLATE.RELAY_CLOSE_CURRENT)).toBe(210);
    expect(rd(RACK_NAMEPLATE.CURRENT_SENSOR_TYPE)).toBe(1);
  });
});

describe("BSCSimulator — demo hız çarpanı (K-20)", () => {
  it("simSpeedMultiplier SOC entegrasyonunu ölçekler; tick ritmi değişmez", () => {
    const make = (speed?: number): BSCSimulator =>
      new BSCSimulator({ deviceId: "BSC-1",
        rackCount: 2,
        registers: [],
        initialSocPercent: 50,
        ...(speed !== undefined ? { simSpeedMultiplier: speed } : {}),
      });
    const drive = (s: BSCSimulator): void => {
      s.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
      s.applyPowerKw(-500); // 500 kW şarj (PCS S06 negatif)
      for (let i = 0; i < 20; i++) s.tick(60);
    };
    const slow = make();
    const fast = make(10);
    drive(slow);
    drive(fast);
    const dSlow = slow.readInputRegister(SYSTEM_SUMMARY.BSC_SOC) - 5000;
    const dFast = fast.readInputRegister(SYSTEM_SUMMARY.BSC_SOC) - 5000;
    expect(dSlow).toBeGreaterThan(0);
    const ratio = dFast / dSlow;
    expect(ratio).toBeGreaterThan(8);
    expect(ratio).toBeLessThan(12);
  });
});

describe("BSCSimulator — Rev AF 0x000B", () => {
  it("0x000B (removed) reddedilir: Ack = Invalid Request", () => {
    const sim = makeReadySim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, 0x000b);
    sim.tick(1);
    expect(sim.readInputRegister(NAMEPLATE.REQUEST_ACKNOWLEDGE)).toBe(ACKNOWLEDGE.INVALID_REQUEST);
  });
});

describe("BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1)", () => {
  const drive = (sim: BSCSimulator, kw: number, seconds: number): void => {
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(kw);
    sim.tick(seconds);
  };
  const socPercent = (sim: BSCSimulator): number =>
    sim.readInputRegister(SYSTEM_SUMMARY.BSC_SOC) / 100;

  it("AK-1.2: 1 saat 500 kW şarj → ΔSOC = P·h·η / kapasite (η=0.975)", () => {
    const sim = makeReadySim(50);
    drive(sim, -500, 3600);
    expect(socPercent(sim)).toBeCloseTo(50 + (500 * 0.975 / 3568) * 100, 1);
  });

  it("deşarjda η bölen olarak uygulanır (P·h/η)", () => {
    const sim = makeReadySim(50);
    drive(sim, 500, 3600);
    expect(socPercent(sim)).toBeCloseTo(50 - (500 / 0.975 / 3568) * 100, 1);
  });

  it("AK-1.4: sonlu olmayan girdi 0 kabul edilir (SOC değişmez)", () => {
    const sim = makeReadySim(50);
    sim.writeHoldingRegister(CONTROLLER.COMMAND_REQUEST, COMMAND.START);
    sim.applyPowerKw(Number.NaN);
    sim.tick(3600);
    expect(socPercent(sim)).toBeCloseTo(50, 2);
  });

  it("AK-1.3: SOC %97'de şarj limiti 0 → SOC artmaz", () => {
    const sim = makeReadySim(97);
    sim.tick(1);
    drive(sim, -500, 3600);
    expect(socPercent(sim)).toBeLessThanOrEqual(97);
  });
});

describe("BSCSimulator — soc enjeksiyonu (test determinizmi)", () => {
  it("soc:<yüzde> tüm rack SOC'sini ayarlar; geçersiz değer false", () => {
    const sim = makeReadySim(50);
    expect(sim.inject("soc:80")).toBe(true);
    sim.tick(1);
    for (const rackId of [1, 2]) {
      const base = RACK_SUMMARY_BASE + (rackId - 1) * RACK_STRIDE;
      expect(sim.readInputRegister(base + RACK_SUMMARY.SOC)).toBe(8000);
    }
    expect(sim.inject("soc:abc")).toBe(false);
  });
});
