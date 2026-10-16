import { describe, it, expect, beforeAll } from "vitest";
import { assertHealthy, modbusRead, modbusWriteSingle, FIELD_URL, CONTAINER_URL } from "./helpers";

/**
 * Protokol uyum (Modbus FC) entegrasyonu — simülatörlere ham TCP probları.
 * v2/dev compose simülatör portlarını host loopback'ine yayınlar.
 * Bulgular: A1, B1, H1, H5, P1/P2, PCS6/7/8 — `DENETIM-ESLEME-v2.md`.
 *
 * Vendor dokümanları okuma için FC03 (Read Holding) şart koşar (PCS/HVAC/
 * Bender/Acrel/PM5340); backend artık bu blokları HOLDING_REGISTER (FC03)
 * olarak okur. Prob, simülatörün FC03'ü gerçekten servediğini doğrular.
 */

interface Ports {
  bsc1: number;
  pcs1Ems: number;
  imd1: number;
  dcMeter1: number;
  hvac1: number;
  pm5340: number;
  mv: number;
}

const P: Ports = {
  bsc1: Number(process.env.BSC1_PORT ?? 15501),
  pcs1Ems: Number(process.env.PCS1_EMS_PORT ?? 1502),
  imd1: Number(process.env.IMD1_PORT ?? 15536),
  dcMeter1: Number(process.env.DCMETER1_PORT ?? 5030),
  hvac1: Number(process.env.HVAC1_PORT ?? 15511),
  pm5340: Number(process.env.PM5340_PORT ?? 15504),
  mv: Number(process.env.MV_PORT ?? 15540),
};

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
});

describe("FC03 okuma şartı (vendor dokümanı)", () => {
  it("PCS: A bloğu FC03 ile okunur (Operation Status 0x2F7D)", async () => {
    const res = await modbusRead(P.pcs1Ems, 3, 12157, 1);
    expect(res.exception).toBeUndefined();
    expect(res.values.length).toBe(1);
  });

  it("B1: IMD izolasyon direnci FC03 ile okunur", async () => {
    const res = await modbusRead(P.imd1, 3, 8192, 2);
    expect(res.exception).toBeUndefined();
    const raw = (res.values[0] << 16) + res.values[1];
    expect(raw).toBeGreaterThan(500_000);
  });

  it("A1: DC sayaç gerilimi FC03 ile okunur (float32 çifti)", async () => {
    const res = await modbusRead(P.dcMeter1, 3, 50, 2);
    expect(res.exception).toBeUndefined();
    expect(res.values.length).toBe(2);
  });

  it("H5: HVAC bilgi bloğu (0x1000) FC03 ile okunur", async () => {
    const res = await modbusRead(P.hvac1, 3, 0x1000, 1);
    expect(res.exception).toBeUndefined();
  });

  it("H1/H2: HVAC uzaktan kapatma (0x202) ve reset (0x200) register'ları erişilebilir", async () => {
    const remote = await modbusRead(P.hvac1, 3, 0x202, 1);
    const reset = await modbusRead(P.hvac1, 3, 0x200, 1);
    expect(remote.exception).toBeUndefined();
    expect(reset.exception).toBeUndefined();
  });

  it("BSC: hem FC03 (holding 40010) hem FC04 (input 30030) erişilebilir", async () => {
    const holding = await modbusRead(P.bsc1, 3, 40010, 1);
    const input = await modbusRead(P.bsc1, 4, 30030, 1);
    expect(holding.exception).toBeUndefined();
    expect(input.exception).toBeUndefined();
  });

  it("DEMO-MV: kesici/toprak konumları FC04 ile okunur", async () => {
    const res = await modbusRead(P.mv, 4, 0, 3);
    expect(res.exception).toBeUndefined();
    expect(res.values.length).toBe(3);
  });
});

describe("PM5340 adres tabanı", () => {
  it("faz A L-N gerilimi config adresinden (~230 V) okunur", async () => {
    // Config 0-tabanlı: VOLTAGE_LN_AVG = 3035 (Schneider 1-tabanlı 3036).
    const res = await modbusRead(P.pm5340, 3, 3035, 2);
    expect(res.exception).toBeUndefined();
    const view = new DataView(new ArrayBuffer(4));
    view.setUint16(0, res.values[0]);
    view.setUint16(2, res.values[1]);
    const voltage = view.getFloat32(0, false);
    expect(voltage).toBeGreaterThan(200);
    expect(voltage).toBeLessThan(260);
  });
});

describe("PCS12 — komut kaynağı (S01) kapısı", () => {
  const S01 = 0x0e00; // Command Source
  const START = 0x0e14; // Start Command
  const STOP = 0x0e15; // Stop Command
  const OP_STATUS = 12157; // 0x2F7D

  it("S01=0 (HMI) iken EMS start yok sayılır; S01=1 sonrası kabul edilir", async () => {
    // Temiz durum (EMS ile stop) → sonra HMI (S01=0)
    await modbusWriteSingle(P.pcs1Ems, S01, 1);
    await modbusWriteSingle(P.pcs1Ems, STOP, 1);
    await modbusWriteSingle(P.pcs1Ems, S01, 0);
    await modbusWriteSingle(P.pcs1Ems, START, 1); // HMI'da yok sayılmalı
    const ignored = (await modbusRead(P.pcs1Ems, 3, OP_STATUS, 1)).values[0];
    expect(ignored).toBe(0); // OP_STOP

    await modbusWriteSingle(P.pcs1Ems, S01, 1); // EMS
    await modbusWriteSingle(P.pcs1Ems, START, 1);
    const accepted = (await modbusRead(P.pcs1Ems, 3, OP_STATUS, 1)).values[0];
    expect(accepted).toBe(1); // OP_STANDBY
    await modbusWriteSingle(P.pcs1Ems, STOP, 1); // restore
  });
});

describe("PCS15 — available energy (SOC × anma enerji)", () => {
  it("B19/B20 = SOC×rated (canlı, BMS bloğu)", async () => {
    // BSC SOC raw (FC04 30055, scale 0.01) → fraction = raw × 0.0001
    const socRaw = (await modbusRead(P.bsc1, 4, 30055, 1)).values[0];
    const frac = Math.min(Math.max(socRaw * 0.0001, 0), 1);
    const ratedKwh = 5018;
    const expected = {
      786: Math.round((1 - frac) * ratedKwh * 10), // charge
      787: Math.round(frac * ratedKwh * 10), // discharge
    };
    const charge = (await modbusRead(P.pcs1Ems, 3, 786, 1)).values[0];
    const discharge = (await modbusRead(P.pcs1Ems, 3, 787, 1)).values[0];
    for (const [addr, exp] of Object.entries(expected)) {
      const actual = Number(addr) === 786 ? charge : discharge;
      const tol = Math.max(100, exp * 0.03); // SOC değişim payı
      expect(Math.abs(actual - exp), `addr ${addr}`).toBeLessThanOrEqual(tol);
    }
  });
});
