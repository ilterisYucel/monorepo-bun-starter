import { describe, it, expect } from "vitest";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import type { CycleSnapshot } from "./cycle-snapshot-store";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * CycleSnapshotStore sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §4, T3):
 *
 * - `record(deviceId, telemetries)`: komut — (deviceId, name) başına EN YENİ
 *   değeri saklar; aynı anahtara yeni kayıt eskisini ezer.
 * - `snapshot()`: sorgu — bayat olmayan (recordedAt > now - maxAgeMs) tüm
 *   girişleri döner; bayat girişleri DEPODAN da temizler (kademeli bozulma:
 *   sessiz cihaz değerlendirmede yok sayılır).
 * - `value(deviceId, key)`: ad ile bakar; yoksa `tags.canonical` indeksine
 *   düşer (ör. key "soc" → "BSC SOC" adlı giriş, canonical "soc").
 * - Yan etki: yalnızca kendi durumu (immutable çıktı sözleşmesi — snapshot
 *   anlık görüntüdür, sonraki record'lar etkilemez).
 * - Limitler: telemetri değeri number|boolean|string; unit boş olabilir.
 */

let clock = 1_000_000;

function telemetry(
  name: string,
  value: number | boolean | string,
  tags?: Record<string, string>,
): TelemetryData {
  return {
    name,
    value,
    unit: "",
    description: "",
    timestamp: new Date(clock).toISOString(),
    deviceId: "bsc-1",
    ...(tags ? { tags } : undefined),
  };
}

function store(maxAgeMs: number): CycleSnapshotStore {
  return new CycleSnapshotStore({ maxAgeMs, now: () => clock });
}

describe("CycleSnapshotStore", () => {
  it("record + snapshot: değer adıyla okunur, unit ve recordedAt taşınır", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 94)]);
    const snap = s.snapshot();
    const v = snap.value("bsc-1", "BSC SOC");
    expect(v?.value).toBe(94);
    expect(v?.recordedAt).toBe(clock);
  });

  it("yeni kayıt eskisini ezer (aynı anahtar)", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    clock += 5000;
    s.record("bsc-1", [telemetry("BSC SOC", 97)]);
    const v = s.snapshot().value("bsc-1", "BSC SOC");
    expect(v?.value).toBe(97);
    expect(v?.recordedAt).toBe(clock);
  });

  it("maxAgeMs aşan giriş snapshot'a girmez", () => {
    const s = store(10_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    clock += 10_001;
    const snap = s.snapshot();
    expect(snap.value("bsc-1", "BSC SOC")).toBeUndefined();
    expect(snap.deviceIds()).not.toContain("bsc-1");
  });

  it("bayat giriş depodan temizlenir — sonraki snapshot tutarlı", () => {
    const s = store(10_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    clock += 10_001;
    s.snapshot();
    clock += 1000;
    const snap = s.snapshot();
    expect(snap.deviceIds()).toHaveLength(0);
  });

  it("olmayan cihaz/anahtar → undefined", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    const snap = s.snapshot();
    expect(snap.value("yok", "BSC SOC")).toBeUndefined();
    expect(snap.value("bsc-1", "yok")).toBeUndefined();
  });

  it("canonical etiketiyle erişim: key ad değilse tags.canonical indeksine düşer", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 88, { canonical: "soc" })]);
    const snap = s.snapshot();
    expect(snap.value("bsc-1", "soc")?.value).toBe(88);
    expect(snap.value("bsc-1", "BSC SOC")?.value).toBe(88);
  });

  it("canonical indeksi de yeni kayıtla güncellenir", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 88, { canonical: "soc" })]);
    clock += 1000;
    s.record("bsc-1", [telemetry("BSC SOC", 91, { canonical: "soc" })]);
    expect(s.snapshot().value("bsc-1", "soc")?.value).toBe(91);
  });

  it("boş store → boş snapshot", () => {
    const s = store(60_000);
    const snap = s.snapshot();
    expect(snap.deviceIds()).toHaveLength(0);
  });

  it("snapshot anlık görüntüdür — sonraki record'lar dönen nesneyi etkilemez", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    const snap: CycleSnapshot = s.snapshot();
    s.record("bsc-1", [telemetry("BSC SOC", 99)]);
    expect(snap.value("bsc-1", "BSC SOC")?.value).toBe(90);
  });

  it("çok cihaz: deviceIds tümünü listeler", () => {
    const s = store(60_000);
    s.record("bsc-1", [telemetry("BSC SOC", 90)]);
    s.record("bsc-2", [telemetry("BSC SOC", 80)]);
    const ids = s.snapshot().deviceIds();
    expect(ids).toHaveLength(2);
    expect(ids).toContain("bsc-1");
    expect(ids).toContain("bsc-2");
  });
});
