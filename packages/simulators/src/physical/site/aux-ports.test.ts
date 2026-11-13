import { describe, expect, it, vi } from "vitest";
import type { DcMeterSimulator } from "../../dc-meter";
import { PipeSet } from "../link/pipe";
import type { WattoxPcs } from "../models/pcs-wattox";
import { AUX_SIGNAL, DcMeterPort, InsulationPort } from "./aux-ports";

/**
 * Aux sinyal portları (T-10) — Plant içi imperatif yama yerine pipe sinyali.
 *
 * Sözleşme:
 * - Sinyal yoksa porta hiç dokunulmaz (bağımsız ünite mock varsayılanları).
 * - Sinyal varsa değer aynen uygulanır (idempotent).
 * - İzolasyon: alarm → 60 kΩ; temiz → 3200 kΩ; fault enjeksiyonu varsa yükseltme YOK.
 */

function pipesWith(values: Record<string, unknown>): PipeSet {
  const pipes = new PipeSet();
  for (const [name, value] of Object.entries(values)) {
    pipes.publish({ name, value, tick: 0, source: "test" });
  }
  pipes.commit();
  return pipes;
}

function fakeMeter(): DcMeterSimulator & { setMeasurements: ReturnType<typeof vi.fn> } {
  return { setMeasurements: vi.fn() } as unknown as DcMeterSimulator & {
    setMeasurements: ReturnType<typeof vi.fn>;
  };
}

const fakePcs = (kohm: number): WattoxPcs => ({ insulationKohm: kohm }) as WattoxPcs;

describe("DcMeterPort", () => {
  it("yayınlanan DC sinyallerini ölçüm olarak yazar", () => {
    const meter = fakeMeter();
    const pipes = pipesWith({
      [AUX_SIGNAL.dcVoltage("C1.BSC-1")]: 1360,
      [AUX_SIGNAL.dcCurrent("C1.BSC-1")]: -68.8,
      [AUX_SIGNAL.dcPower("C1.BSC-1")]: 93.6,
    });
    new DcMeterPort(pipes).apply(meter, "C1.BSC-1", 0);
    expect(meter.setMeasurements).toHaveBeenCalledWith({ voltage: 1360, current: -68.8, power: 93.6 });
  });

  it("sinyal yoksa metreye dokunmaz (mock varsayılanı korunur)", () => {
    const meter = fakeMeter();
    new DcMeterPort(pipesWith({})).apply(meter, "C1.BSC-1", 0);
    expect(meter.setMeasurements).not.toHaveBeenCalled();
  });
});

describe("InsulationPort", () => {
  it("IMD alarmı → PCS izolasyonu 60 kΩ", () => {
    const pcs = fakePcs(3200);
    const pipes = pipesWith({ [AUX_SIGNAL.imdAlarm("C1")]: true });
    new InsulationPort(pipes).apply(pcs, "C1", 0, false);
    expect(pcs.insulationKohm).toBe(60);
  });

  it("alarm yok → 3200 kΩ'a döner", () => {
    const pcs = fakePcs(60);
    new InsulationPort(pipesWith({ [AUX_SIGNAL.imdAlarm("C1")]: false })).apply(pcs, "C1", 0, false);
    expect(pcs.insulationKohm).toBe(3200);
  });

  it("fault enjeksiyonu varsa yükseltme yapılmaz (enjeksiyon korunur)", () => {
    const pcs = fakePcs(100);
    new InsulationPort(pipesWith({ [AUX_SIGNAL.imdAlarm("C1")]: false })).apply(pcs, "C1", 0, true);
    expect(pcs.insulationKohm).toBe(100);
  });
});
