import { describe, expect, it } from "vitest";
import { BSCSimulatorAdapter, type IBscSimulatorSurface } from "./bsc-modbus-adapter";

/**
 * Modbus köprüsü (BSC) sözleşmesi — köprü davranış bilmez, yalnız yüzün
 * tekli/batch okuma-yazma yöntemlerini iletir (birleştirme SPEC §5.1).
 */

function fakeSurface(values: {
  input?: Record<number, number>;
  holding?: Record<number, number>;
  coils?: Record<number, boolean>;
  discrete?: Record<number, boolean>;
}): IBscSimulatorSurface & { writes: Array<[number, number]> } {
  const writes: Array<[number, number]> = [];
  const holding = { ...(values.holding ?? {}) };
  return {
    writes,
    readInputRegister: (a) => values.input?.[a] ?? 0,
    readHoldingRegister: (a) => holding[a] ?? 0,
    writeHoldingRegister: (a, v) => {
      writes.push([a, v]);
      holding[a] = v;
    },
    readCoil: (a) => values.coils?.[a] ?? false,
    writeCoil: () => undefined,
    readDiscreteInput: (a) => values.discrete?.[a] ?? false,
  };
}

describe("BSCSimulatorAdapter — köprü sözleşmesi", () => {
  it("tekli okumalar yüzden aynen geçer", async () => {
    const adapter = new BSCSimulatorAdapter(
      fakeSurface({ input: { 30036: 3 }, holding: { 40010: 5 }, coils: { 1: true }, discrete: { 2: true } }),
    );
    expect(await adapter.readInputRegister(30036)).toBe(3);
    expect(await adapter.readHoldingRegister(40010)).toBe(5);
    expect(await adapter.readCoil(1)).toBe(true);
    expect(await adapter.readDiscreteInput(2)).toBe(true);
  });

  it("batch okumalar adres artan sırayla döner (boşluklar 0/false)", async () => {
    const adapter = new BSCSimulatorAdapter(fakeSurface({ input: { 30030: 7 }, coils: { 3: true } }));
    expect(await adapter.readInputRegisters(30030, 3)).toEqual([7, 0, 0]);
    expect(await adapter.readHoldingRegisters(40000, 2)).toEqual([0, 0]);
    expect(await adapter.readCoils(2, 3)).toEqual([false, true, false]);
    expect(await adapter.readDiscreteInputs(1, 2)).toEqual([false, false]);
  });

  it("tekli/batch yazımlar yüzeyde adres artan sırayla uygulanır", async () => {
    const surface = fakeSurface({});
    const adapter = new BSCSimulatorAdapter(surface);
    await adapter.writeHoldingRegister(40010, 2);
    await adapter.writeHoldingRegisters(40020, [1, 0, 1]);
    await adapter.writeCoil(5, true);
    await adapter.writeMultipleCoils(6, [true, false]);
    expect(surface.writes).toEqual([
      [40010, 2],
      [40020, 1],
      [40021, 0],
      [40022, 1],
    ]);
  });
});
