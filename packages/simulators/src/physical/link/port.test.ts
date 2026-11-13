// Cihaz portu kanıtları — SPEC SIMULATOR-PIPE §6.2.
// AK-2.1 bağımsız ünite (pipe'sız) · AK-2.2 deterministik gecikme · T-5 transform.
import { describe, expect, it } from "vitest";
import { MockTransport, PipeSet } from "./pipe";
import { InputPort, OutputPort } from "./port";

describe("InputPort / OutputPort — UC-2", () => {
  it("AK-2.1: pipe'sız ünite yalnız port fallback'ıyla çalışır", () => {
    const set = new PipeSet({ transport: new MockTransport() });
    const busVoltage = new InputPort<number>(set, { pipe: "dc.bus.voltage", fallback: 1500 });
    const powerLimit = new InputPort<number>(set, { pipe: "bms.dischargeLimit", fallback: 1000 });

    // Bağımsız ünite tick'i: değerler fallback'ten gelir, hata yok.
    expect(busVoltage.read()).toBe(1500);
    expect(powerLimit.read()).toBe(1000);

    // Bağlı olmayan çıkış portu yayını sessizce yutulur.
    const out = new OutputPort(set, "pcs.power");
    out.publish(-500, "PCS-1");
    set.commit();
    expect(set.read("pcs.power")).toBeUndefined();
  });

  it("AK-2.2: yayın aynı tick görünmez; commit sonrası görünür", () => {
    const set = new PipeSet();
    const consumer = new InputPort<number>(set, { pipe: "bsc.soc", fallback: 50 });
    const producer = new OutputPort(set, "bsc.soc");

    expect(consumer.read()).toBe(50); // yayın yok → fallback
    producer.publish(55, "C1.BSC-1", 1);
    expect(consumer.read()).toBe(50); // aynı tick → eski değer
    set.commit();
    expect(consumer.read()).toBe(55); // sonraki tick → yeni değer
  });

  it("pipe default'u port fallback'ından önce gelir", () => {
    const set = new PipeSet({ defaults: { "hvac.setpoint": 24 } });
    const port = new InputPort<number>(set, { pipe: "hvac.setpoint", fallback: 18 });
    expect(port.read()).toBe(24);
  });

  it("T-5: transform — ratio/offset ve bit seçimi", () => {
    const set = new PipeSet();
    set.publish({ name: "raw.soc", value: 550, tick: 1, source: "unit" });
    set.publish({ name: "raw.status", value: 0b0100, tick: 1, source: "unit" });
    set.commit();

    const scaled = new InputPort<number>(set, {
      pipe: "raw.soc",
      transform: { ratio: 0.1 },
    });
    expect(scaled.read()).toBe(55);

    const offset = new InputPort<number>(set, {
      pipe: "raw.soc",
      transform: { ratio: 0.1, offset: -5 },
    });
    expect(offset.read()).toBe(50);

    const bit = new InputPort<number>(set, {
      pipe: "raw.status",
      transform: { bit: 2 },
    });
    expect(bit.read()).toBe(1);
  });

  it("T-5: transform sonucu işaretsiz 16-bit'e maskelenir (BmsLink davranışı)", () => {
    const set = new PipeSet();
    set.publish({ name: "neg", value: -500, tick: 1, source: "unit" });
    set.commit();
    const port = new InputPort<number>(set, { pipe: "neg", transform: {} });
    expect(port.read()).toBe((-500 & 0xffff) >>> 0);
  });

  it("sayısal olmayan değerde transform uygulanmaz", () => {
    const set = new PipeSet();
    set.publish({ name: "mode", value: "run", tick: 1, source: "unit" });
    set.commit();
    const port = new InputPort<string>(set, { pipe: "mode", transform: { ratio: 2 } });
    expect(port.read()).toBe("run");
  });
});
