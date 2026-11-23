import { describe, expect, it } from "vitest";
import { durationText, estimateProgram, feederGroups, planTimes, reactivePlan } from "./ops-estimate";

const base = {
  units: [
    { n: 1, soc: 50, available: true },
    { n: 2, soc: 50, available: true },
  ],
  pcsPerUnit: 2,
  powerMW: 4,
  socMin: 3.5,
  socMax: 97,
  unitMWh: 3.5,
};

describe("estimateProgram — beklenen sonuç (FL-02)", () => {
  it("hedef SOC'ye kadar süre/enerji/SOC tahmini verir", () => {
    const r = estimateProgram({ ...base, dir: "chg", targetSoc: 60 });
    // 4 MW / 4 PCS = 1 MW/PCS; ünite başına 2 MW → %/h = 2/3.5*100*0.975 ≈ 55.71
    expect(r.pcs).toBe(4);
    expect(r.eachMW).toBeCloseTo(1, 6);
    expect(r.durationH).toBeCloseTo(10 / 55.714, 2);
    expect(r.energyMWh).toBeCloseTo(4 * r.durationH, 6);
    expect(r.socAfter).toBeCloseTo(60, 1);
  });

  it("hedef boşsa tam şarj/deşarj limitini kullanır", () => {
    const chg = estimateProgram({ ...base, dir: "chg" });
    expect(chg.target).toBe(97);
    const dis = estimateProgram({ ...base, dir: "dis" });
    expect(dis.target).toBe(3.5);
    expect(dis.socAfter).toBeCloseTo(3.5, 1);
  });

  it("müsait olmayan üniteleri bölüşüme katmaz", () => {
    const r = estimateProgram({
      ...base,
      units: [
        { n: 1, soc: 50, available: true },
        { n: 2, soc: 50, available: false },
      ],
      dir: "chg",
      targetSoc: 60,
    });
    expect(r.pcs).toBe(2);
    expect(r.eachMW).toBeCloseTo(2, 6);
  });

  it("güç 0 ise süre 0 (bölme yok)", () => {
    const r = estimateProgram({ ...base, dir: "chg", powerMW: 0, targetSoc: 60 });
    expect(r.durationH).toBe(0);
    expect(r.energyMWh).toBe(0);
  });

  it("SOC limitine dayanan ünite varsa limitHit işaretlenir", () => {
    // 96% ünite hedefe (95) varmadan 97 limitine dayanır → erken durur.
    const limited = estimateProgram({
      ...base,
      units: [
        { n: 1, soc: 96, available: true },
        { n: 2, soc: 10, available: true },
      ],
      dir: "chg",
      targetSoc: 95,
    });
    expect(limited.limitHit).toBe(true);

    // İki ünite de hedefe limitlerden önce varır → limit vurulmaz.
    const clean = estimateProgram({
      ...base,
      units: [
        { n: 1, soc: 40, available: true },
        { n: 2, soc: 42, available: true },
      ],
      dir: "chg",
      targetSoc: 50,
    });
    expect(clean.limitHit).toBe(false);
    // Süre en yavaş üniteye göre: hızlı olan hedefi bir miktar aşar (ortalama 50–51 arası).
    expect(clean.socAfter).toBeGreaterThanOrEqual(50);
    expect(clean.socAfter).toBeLessThanOrEqual(51);
  });
});

describe("feederGroups — fider satırları", () => {
  it("topoloji fiderlerini hücre + ünitelerle döner", () => {
    const groups = feederGroups({
      A: { cell: "H04", units: [1, 2] },
      B: { cell: "H05", units: [3] },
    });
    expect(groups).toEqual([
      { key: "A", cell: "H04", units: [1, 2] },
      { key: "B", cell: "H05", units: [3] },
    ]);
  });
});

describe("durationText", () => {
  it("saat/dakika biçimler", () => {
    expect(durationText(1.5)).toBe("1 h 30 min");
    expect(durationText(0)).toBe("0 h 00 min");
    expect(durationText(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("reactivePlan — Q/PF + TEİAŞ P–Q", () => {
  const base = { eachMW: 0.25, pcs: 4, pcsMaxMVA: 1.725, connMW: 30 };

  it("Q = 0 ise yalnız aktif güç", () => {
    const r = reactivePlan({ ...base, mode: "none" });
    expect(r.qTotMvar).toBe(0);
    expect(r.sTotMVA).toBeCloseTo(1, 6);
    expect(r.teiasOk).toBe(true);
  });

  it("sabit Q toplamı PCS'lere eşit böler (kapasitif +)", () => {
    const r = reactivePlan({ ...base, mode: "q", qMvar: 2, qSide: "cap" });
    expect(r.qEachMvar).toBeCloseTo(0.5, 6);
    expect(r.qTotMvar).toBeCloseTo(2, 6);
  });

  it("indüktif Q negatif işaretlidir", () => {
    const r = reactivePlan({ ...base, mode: "q", qMvar: 2, qSide: "ind" });
    expect(r.qTotMvar).toBeCloseTo(-2, 6);
  });

  it("sabit PF: her PCS'te aynı PF, S limitte kısıtlanır", () => {
    const r = reactivePlan({ ...base, mode: "pf", pf: 0.95, pfSide: "lag", priority: 0 });
    expect(r.pf).toBeGreaterThan(0.9);
    expect(r.sEachMVA).toBeLessThanOrEqual(1.725 + 1e-9);
  });

  it("S limiti aşılırsa kısıtlar ve alan içinde kalır", () => {
    const r = reactivePlan({ ...base, eachMW: 3, mode: "q", qMvar: 20, qSide: "cap" });
    expect(r.limited).toBe(true);
    expect(r.sEachMVA).toBeLessThanOrEqual(1.725 + 1e-9);
    expect(r.teiasOk).toBe(true);
  });

  it("TEİAŞ alanı dışı: küçük bağlantı gücünde Q pu > 0.4", () => {
    const r = reactivePlan({ ...base, eachMW: 1, mode: "q", qMvar: 4, qSide: "cap", connMW: 5 });
    expect(r.limited).toBe(false);
    expect(r.pPpu).toBeCloseTo(0.8, 6);
    expect(r.qPpu).toBeCloseTo(0.8, 6);
    expect(r.teiasOk).toBe(false);
  });
});

describe("planTimes — FL-02 zaman planı", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");

  it("now + SOC: başlangıç şimdi, bitiş başlangıç", () => {
    const r = planTimes({ now, startMode: "now", endMode: "soc" });
    expect(r.startAt).toBe(now);
    expect(r.startOk).toBe(true);
    expect(r.endAt).toBe(now);
  });

  it("scheduled start geçmişteyse startOk=false", () => {
    const r = planTimes({ now, startMode: "at", startDay: 0, startTime: "09:00", endMode: "soc" });
    expect(r.startOk).toBe(false);
  });

  it("bitiş başlangıçtan önceyse endOk=false", () => {
    const r = planTimes({
      now,
      startMode: "now",
      endMode: "time",
      endDay: 0,
      endTime: "09:00",
    });
    expect(r.endOk).toBe(false);
  });
});
