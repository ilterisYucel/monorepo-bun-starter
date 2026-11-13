import { describe, expect, it } from "vitest";
import { bscLegacySide, bscPhysicalSide } from "./bsc-sides";
import {
  BSC_SEQUENCE,
  HVAC_SEQUENCE,
  PCS_SEQUENCE,
  diffCount,
  formatReport,
  runEquivalence,
  type EquivalenceSide,
  type SequenceStep,
} from "./equivalence";

const BSC_CONFIG = { deviceId: "BSC-1", rackCount: 8, initialSocPercent: 50, initialTempC: 25 };

/**
 * Harness sözleşmesi (UC-1 / FR-1.1) — harness davranış bilmez, yalnız
 * okuma/yazma/ilerletme yapar ve adım başına satır üretir.
 */

function side(values: Record<number, number>, log?: string[]): EquivalenceSide {
  const state = { ...values };
  return {
    read: (address) => {
      log?.push(`read ${address}`);
      return address in state ? state[address] : undefined;
    },
    write: (address, value) => {
      log?.push(`write ${address}=${value}`);
      state[address] = value;
    },
    advance: (seconds) => {
      log?.push(`advance ${seconds}`);
    },
  };
}

describe("eşdeğerlik harness'i — sözleşme", () => {
  it("aynı iki yüz → fark 0; her sekans adımı için tek satır", () => {
    const steps: SequenceStep[] = [
      { op: "read", address: 30036 },
      { op: "write", address: 40010, value: 2 },
      { op: "advance", seconds: 5 },
      { op: "read", address: 30036 },
    ];
    const a = side({ 30036: 3 });
    const b = side({ 30036: 3 });
    const rows = runEquivalence(a, b, steps);
    expect(rows).toHaveLength(steps.length);
    expect(diffCount(rows)).toBe(0);
  });

  it("farklı değer → fark satırı; yazma/ilerletme çağrıları iki tarafa da gider", () => {
    const logA: string[] = [];
    const logB: string[] = [];
    const steps: SequenceStep[] = [
      { op: "write", address: 40010, value: 2 },
      { op: "read", address: 30030 },
    ];
    const rows = runEquivalence(side({ 30030: 2 }, logA), side({ 30030: 5 }, logB), steps);
    expect(logA).toEqual(logB);
    expect(diffCount(rows)).toBe(1);
    expect(rows[1]).toEqual({ step: 2, op: "read", address: 30030, table: "holding", legacy: 2, physical: 5, diff: true });
  });

  it("desteklenmeyen adres (-) satırı üretir ve harness durmaz", () => {
    const steps: SequenceStep[] = [
      { op: "read", address: 99999 },
      { op: "read", address: 30055 },
    ];
    const rows = runEquivalence(side({ 99999: 0, 30055: 50 }), side({ 30055: 50 }), steps);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ step: 1, op: "read", address: 99999, table: "holding", legacy: 0, physical: "-", diff: true });
    expect(rows[1]).toEqual({ step: 2, op: "read", address: 30055, table: "holding", legacy: 50, physical: 50, diff: false });
  });

  it("rapor yalnız farkları yazar (KAPANIŞ kanıtı)", () => {
    const rows = runEquivalence(side({ 1: 1, 2: 9 }), side({ 1: 1, 2: 8 }), [
      { op: "read", address: 1 },
      { op: "read", address: 2 },
    ]);
    const report = formatReport(rows);
    expect(report).toBe(
      ["| # | op | adres | legacy | fiziksel | |", "| --- | --- | --- | --- | --- | --- |", "| 2 | read | 2 | 9 | 8 | FARK |"].join("\n"),
    );
    expect(formatReport(rows, false).split("\n")).toHaveLength(4); // başlık + ayraç + 2 satır
  });

  it("sekans verisi sabittir (eşdeğerlik sözleşmesi — snapshot)", () => {
    expect(BSC_SEQUENCE).toMatchSnapshot();
    expect(PCS_SEQUENCE).toMatchSnapshot();
    expect(HVAC_SEQUENCE).toMatchSnapshot();
  });
});

describe("BSC sekansı (AK-1.1 — iki yüzün kayıtları üretilir)", () => {
  it("sekans iki tarafta da koşar, satırlar üretilir", () => {
    const rows = runEquivalence(bscLegacySide(BSC_CONFIG), bscPhysicalSide(BSC_CONFIG), BSC_SEQUENCE);
    expect(rows).toHaveLength(BSC_SEQUENCE.length);
    // En az bir okuma iki tarafta da sayısal olmalı (yüzler gerçekten koştu).
    const numeric = rows.filter((r) => r.op === "read" && r.legacy !== "-" && r.physical !== "-");
    expect(numeric.length).toBeGreaterThan(0);
  });
});
