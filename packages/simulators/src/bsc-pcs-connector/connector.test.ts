import { describe, it, expect, vi } from "vitest";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { parseBscPcsMapping } from "./mapping";
import { BscPcsConnectorAdapter } from "./connector";
import type { IBmsTarget } from "./tcp-target";

/**
 * BSC→PCS connector sözleşmesi (BSC-PCS-CONNECTOR-MIMARISI §4-§5, T-C5):
 *
 * - Mapping parse'ı STRICT: bilinmeyen anahtar/kind, eksik alan, BMS bloğu
 *   dışı `to` → ValidationError throw (fail-fast).
 * - Dönüşüm: raw_pcs = round(raw_bsc × ratio + offset); bit eşlemesi hedef
 *   kelime MIRROR'ı üzerinde (diğer bitler bozulmaz).
 * - tick: değişen adresler intervalMs kısıtıyla yazılır; değişmeyen tick'te
 *   yazım YAPILMAZ; kaynak hatası kademeli; yazım hatası link=0 + fail
 *   sayacı + sonraki tick yeniden bağlanır.
 * - İzleme register'ları okunur; yazma girişimleri yok sayılır.
 */

let clock = 1_000_000;

const VALID_MAPPING_JSON = JSON.stringify({
  target: { host: "127.0.0.1", port: 15502 },
  intervalMs: 5000,
  mappings: [
    { kind: "register", from: { deviceId: "BSC-1", table: "input", address: 30055 }, to: 772, ratio: 0.1, offset: 0 },
    { kind: "register", from: { deviceId: "BSC-1", table: "input", address: 30059 }, to: 770, ratio: 0.001, offset: 0 },
    { kind: "bit", from: { deviceId: "BSC-1", table: "input", address: 30037, bit: 0 }, to: 769, bit: 7 },
    { kind: "constant", to: 788, value: 5018 },
  ],
});

function fakeSource(readInput: Record<number, number>): IModbusSimulatorAdapter {
  return {
    readInputRegister: vi.fn(async (address: number) => {
      if (!(address in readInput)) throw new Error("adres yok");
      return readInput[address]!;
    }),
    readHoldingRegister: vi.fn(async () => 0),
    readInputRegisters: vi.fn(),
    readHoldingRegisters: vi.fn(),
    writeHoldingRegister: vi.fn(),
    writeHoldingRegisters: vi.fn(),
    readCoil: vi.fn(),
    readCoils: vi.fn(),
    writeCoil: vi.fn(),
    writeMultipleCoils: vi.fn(),
    readDiscreteInput: vi.fn(),
    readDiscreteInputs: vi.fn(),
  } as unknown as IModbusSimulatorAdapter;
}

function fakeTarget(): { target: IBmsTarget; writes: Array<{ address: number; values: number[] }>; connect: ReturnType<typeof vi.fn> } {
  const writes: Array<{ address: number; values: number[] }> = [];
  const connect = vi.fn().mockResolvedValue(undefined);
  const target: IBmsTarget = {
    connect,
    writeRegisters: vi.fn(async (address: number, values: number[]) => {
      writes.push({ address, values });
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { target, writes, connect };
}

function adapter(overrides: { target?: IBmsTarget; mapping?: ReturnType<typeof parseBscPcsMapping>; sources?: Record<string, IModbusSimulatorAdapter> } = {}) {
  const sources = overrides.sources ?? {
    "BSC-1": fakeSource({ 30055: 5500, 30059: 15000000, 30037: 0b1 }),
  };
  return new BscPcsConnectorAdapter({
    mapping: overrides.mapping ?? parseBscPcsMapping(VALID_MAPPING_JSON),
    adapters: new Map(Object.entries(sources)),
    target: overrides.target,
    now: () => clock,
  });
}

describe("parseBscPcsMapping", () => {
  it("geçerli dosyayı parse eder (üç kind)", () => {
    const m = parseBscPcsMapping(VALID_MAPPING_JSON);
    expect(m.mappings).toHaveLength(4);
    expect(m.target.port).toBe(15502);
    expect(m.intervalMs).toBe(5000);
  });

  it("bilinmeyen kind → throw", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, mappings: [{ kind: "dance", to: 772 }] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });

  it("register mapping'de from/ratio eksik → throw", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, mappings: [{ kind: "register", to: 772, ratio: 1 }] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });

  it("bit mapping'de from.bit eksik → throw", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, mappings: [{ kind: "bit", from: { deviceId: "BSC-1", table: "input", address: 1 }, to: 769, bit: 7 }] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });

  it("BMS bloğu dışı to → throw", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, mappings: [{ kind: "constant", to: 767, value: 1 }] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });

  it("bilinmeyen anahtar → throw (strict)", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, version: 2, mappings: [{ kind: "constant", to: 788, value: 1 }] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });

  it("boş mappings → throw", () => {
    const json = JSON.stringify({ target: { host: "h", port: 1 }, intervalMs: 1000, mappings: [] });
    expect(() => parseBscPcsMapping(json)).toThrow();
  });
});

describe("BscPcsConnectorAdapter", () => {
  it("tick: register dönüşümleri yazılır (ratio/offset, yuvarlama; bitişik koşular)", async () => {
    const { target, writes, connect } = fakeTarget();
    const conn = adapter({ target });
    await conn.tick(1);

    expect(connect).toHaveBeenCalledTimes(1);
    // bitişik olmayan kirli adresler ayrı koşular olarak yazılır
    expect(writes).toEqual([
      { address: 769, values: [0x80, 15000] },
      { address: 772, values: [550] },
      { address: 788, values: [5018] },
    ]);
  });

  it("değişmeyen değerler ikinci tick'te yazılmaz", async () => {
    const { target, writes } = fakeTarget();
    const conn = adapter({ target });
    await conn.tick(1);
    const firstCount = writes.length;
    expect(firstCount).toBeGreaterThan(0);

    clock += 6000;
    await conn.tick(1);
    expect(writes.length).toBe(firstCount); // yeni yazım yok
  });

  it("kaynak değişince intervalMs sonrası yeniden yazılır", async () => {
    const source = fakeSource({ 30055: 5500, 30059: 15000000, 30037: 0b1 });
    const { target, writes } = fakeTarget();
    const conn = adapter({ target, sources: { "BSC-1": source } });
    await conn.tick(1);
    const firstCount = writes.length;
    expect(firstCount).toBeGreaterThan(0);

    (source.readInputRegister as ReturnType<typeof vi.fn>).mockImplementation(async (address: number) => {
      const table: Record<number, number> = { 30055: 6000, 30059: 15000000, 30037: 0b1 };
      return table[address]!;
    });
    clock += 4000;
    await conn.tick(1); // intervalMs dolmadı — yazım yok
    expect(writes.length).toBe(firstCount);
    clock += 2000;
    await conn.tick(1);
    expect(writes.length).toBe(firstCount + 1);
    // yalnızca DEĞİŞEN adres yazılır: 772 (SOC)
    const newWrite = writes[writes.length - 1]!;
    expect(newWrite.address).toBe(772);
    expect(newWrite.values[0]).toBe(600); // SOC 6000 × 0.1
  });

  it("kaynak hatası kademeli — diğer eşleşmeler devam eder", async () => {
    const good = fakeSource({ 30055: 5500, 30059: 15000000, 30037: 0b1 });
    const bad = {
      ...fakeSource({}),
    };
    const { target, writes } = fakeTarget();
    const mapping = parseBscPcsMapping(
      JSON.stringify({
        target: { host: "h", port: 1 },
        intervalMs: 5000,
        mappings: [
          { kind: "register", from: { deviceId: "BSC-1", table: "input", address: 30055 }, to: 772, ratio: 0.1, offset: 0 },
          { kind: "register", from: { deviceId: "YOK-1", table: "input", address: 1 }, to: 780, ratio: 1, offset: 0 },
        ],
      }),
    );
    const conn = adapter({ target, mapping, sources: { "BSC-1": good, "YOK-1": bad } });
    await conn.tick(1);
    expect(writes.length).toBe(1);
    expect(writes[0]!.values[0]).toBe(550);
    expect(await conn.readInputRegister(1)).toBe(1); // kısmi kaynak durumu
  });

  it("yazım hatası → link 0 + fail sayacı; sonraki tick yeniden bağlanır", async () => {
    const target: IBmsTarget = {
      connect: vi.fn().mockResolvedValue(undefined),
      writeRegisters: vi
        .fn()
        .mockRejectedValueOnce(new Error("conn refused"))
        .mockResolvedValueOnce(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const conn = adapter({ target });
    await conn.tick(1);
    expect(await conn.readInputRegister(0)).toBe(0); // link kopuk
    expect(await conn.readInputRegister(6)).toBe(1); // fail sayacı 1

    clock += 6000;
    await conn.tick(1);
    expect(await conn.readInputRegister(0)).toBe(1); // bağlı
    expect(await conn.readInputRegister(6)).toBe(1);
    expect(await conn.readInputRegister(4)).toBe(1); // yazım sayacı 1
  });

  it("kaynak yoksa yazım yapılmaz ve kaynak durumu 2 olur", async () => {
    const { target, writes, connect } = fakeTarget();
    const mapping = parseBscPcsMapping(
      JSON.stringify({
        target: { host: "h", port: 1 },
        intervalMs: 5000,
        mappings: [{ kind: "register", from: { deviceId: "YOK-1", table: "input", address: 1 }, to: 772, ratio: 1, offset: 0 }],
      }),
    );
    const conn = adapter({ target, mapping, sources: {} });
    await conn.tick(1);
    expect(writes.length).toBe(0);
    expect(connect).not.toHaveBeenCalled();
    expect(await conn.readInputRegister(1)).toBe(2);
  });

  it("bit eşlemesi hedef kelimenin diğer bitlerini bozmaz", async () => {
    const { target, writes } = fakeTarget();
    const mapping = parseBscPcsMapping(
      JSON.stringify({
        target: { host: "h", port: 1 },
        intervalMs: 5000,
        mappings: [
          { kind: "bit", from: { deviceId: "BSC-1", table: "input", address: 30037, bit: 0 }, to: 769, bit: 7 },
          { kind: "bit", from: { deviceId: "BSC-1", table: "input", address: 30037, bit: 2 }, to: 769, bit: 1 },
        ],
      }),
    );
    const conn = adapter({ target, mapping, sources: { "BSC-1": fakeSource({ 30037: 0b101 }) } });
    await conn.tick(1);
    // bit0(adres30037)=1 → hedef bit7; bit2=1 → hedef bit1 → 0x80|0x02 = 0x82
    expect(writes[0]!.values[0]).toBe(0x82);
  });

  it("yazma girişimi yok sayılır", async () => {
    const conn = adapter({});
    await conn.writeHoldingRegister(0, 123);
    expect(await conn.readHoldingRegister(0)).toBe(0);
  });
});
