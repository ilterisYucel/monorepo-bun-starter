import { describe, it, expect, vi } from "vitest";
import { ModbusDevice } from "./device";
import type { IModbusTransport } from "./transport/interface";
import type { ModbusDeviceConfig } from "./device";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * ModbusDevice.read() ISP sözleşmesi (Faz 0 eki):
 * - read() cihazın TÜM telemetrisini döner: register telemetrileri +
 *   bitfield çıktıları birleşik (IDevice'te readBitfields YOKTUR).
 * - Boş okuma (eşleşen telemetri yok) boş dizi döner.
 * - Okuma sıralaması: tip sırası HOLDING, INPUT, COIL, DISCRETE, bitfield;
 *   tip içi adrese göre (priority okumada kullanılmaz). Gruplar paralel
 *   okunur; sonuç sırası deterministiktir.
 * - Bitfield alanları 0-31 bit aralığında olmalı; registerType yalnızca
 *   HOLDING/INPUT — aksi constructor throw.
 *
 * write()/writeAtomic() sözleşmesi (2026-08-30 — TEİAŞ #22 + transactional):
 * - write: scale/offset uygulanmış ham değerler gruplar halinde yazılır;
 *   COIL ayrıca writeCoils ile gider; boş/config'te olmayan girdi sessizce
 *   atlanır. priority YALNIZCA yazma sırasını belirler.
 * - writeAtomic: önce ham register backup'ı (COIL → readCoils, HOLDING →
 *   readHoldingRegisters, paralel) → planlanan yazılar → hata durumunda
 *   yazılanlar ham backup'la geri yüklenir → ORİJİNAL hata yeniden fırlatılır;
 *   rollback'in kendisi hata verirse orijinal hata fırlar.
 * - Yalnızca INPUT_REGISTER girdi varsa writeAtomic no-op'tur.
 * - Yazma grubu 125 register'ı aşamaz ("Batch too large").
 * - Bağlantı kopuksa reconnect; 10 sn cooldown içinde tekrar deneme yapılmaz
 *   ("reconnect cooldown active" hatası — mevcut davranışın karakterizasyonu).
 */

function point(name: string, value: string | number | boolean): TelemetryData {
  return {
    deviceId: "bsc-1",
    name,
    description: name,
    value,
    unit: "",
    timestamp: "2026-08-30T12:00:00.000Z",
  };
}

function makeTransport(overrides: Partial<IModbusTransport> = {}): IModbusTransport {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    reconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    readHoldingRegisters: vi.fn().mockResolvedValue([230]),
    readInputRegisters: vi.fn().mockResolvedValue([5]),
    readCoils: vi.fn().mockResolvedValue([true]),
    readDiscreteInputs: vi.fn().mockResolvedValue([false]),
    writeHoldingRegisters: vi.fn().mockResolvedValue(undefined),
    writeCoils: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function holdingTelemetry(
  overrides: Record<string, unknown> = {},
): ModbusDeviceConfig["telemetryList"][number] {
  return {
    protocol: "MODBUS",
    name: "Voltage",
    description: "Gerilim",
    value: 0,
    unit: "V",
    timestamp: "",
    deviceId: "bsc-1",
    registerAddress: 100,
    registerTableType: "HOLDING_REGISTER",
    registerDataType: "UINT16",
    byteOrder: "BIG_ENDIAN",
    scale: 1,
    offset: 0,
    ...overrides,
  } as ModbusDeviceConfig["telemetryList"][number];
}

function makeConfig(overrides: Partial<ModbusDeviceConfig> = {}): ModbusDeviceConfig {
  return {
    id: "bsc-1",
    name: "BSC 1",
    manufacturer: "LG",
    model: "BSC",
    connection: { host: "127.0.0.1" },
    telemetryList: [
      {
        protocol: "MODBUS",
        name: "Voltage",
        description: "Gerilim",
        value: 0,
        unit: "V",
        timestamp: "",
        deviceId: "bsc-1",
        registerAddress: 100,
        registerTableType: "HOLDING_REGISTER",
        registerDataType: "UINT16",
        byteOrder: "BIG_ENDIAN",
        scale: 1,
        offset: 0,
        priority: 0,
      },
    ],
    bitfieldConfigs: [
      {
        registerAddress: 30037,
        registerType: "INPUT_REGISTER",
        fields: [
          {
            bitStart: 0,
            bitEnd: 0,
            name: "BSC Alarm",
            dataTag: "d1",
            description: "Alarm biti",
            unit: "-",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("ModbusDevice.read() ISP sözleşmesi", () => {
  it("register + bitfield çıktılarını birleşik döner", async () => {
    const device = new ModbusDevice(makeConfig(), makeTransport());
    const results = await device.read();

    const names = results.map((t) => t.name);
    expect(names).toContain("Voltage");
    expect(names).toContain("BSC Alarm");
  });

  it("bitfield bit değeri mask ile çıkarılır", async () => {
    const transport = makeTransport({
      readInputRegisters: vi.fn().mockResolvedValue([0b101]),
    });
    const device = new ModbusDevice(makeConfig(), transport);
    const results = await device.read();

    const alarm = results.find((t) => t.name === "BSC Alarm");
    expect(alarm?.value).toBe(1);
  });

  it("bitfield config yoksa yalnızca register telemetrileri döner", async () => {
    const device = new ModbusDevice(
      makeConfig({ bitfieldConfigs: undefined }),
      makeTransport(),
    );
    const results = await device.read();
    expect(results.map((t) => t.name)).toEqual(["Voltage"]);
  });
});

describe("ModbusDevice.write()", () => {
  it("scale/offset uygulanmış ham değeri HOLDING register'ına yazar", async () => {
    const transport = makeTransport();
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [holdingTelemetry({ name: "Power", scale: 10, offset: 5 })],
    });
    const device = new ModbusDevice(config, transport);
    await device.write([point("Power", 465)]);

    expect(transport.writeHoldingRegisters).toHaveBeenCalledWith(100, [46]);
    expect(transport.writeCoils).not.toHaveBeenCalled();
  });

  it("COIL telemetrisini writeCoils ile boolean olarak yazar", async () => {
    const transport = makeTransport();
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "Enable",
          registerAddress: 200,
          registerTableType: "COIL",
        }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    await device.write([point("Enable", 1)]);
    expect(transport.writeCoils).toHaveBeenCalledWith(200, [true]);

    await device.write([point("Enable", 0)]);
    expect(transport.writeCoils).toHaveBeenCalledWith(200, [false]);
  });

  it("boş girdi → transport'a yazma çağrısı YAPILMAZ", async () => {
    const transport = makeTransport();
    const device = new ModbusDevice(
      makeConfig({ bitfieldConfigs: undefined }),
      transport,
    );
    await device.write([]);
    expect(transport.writeHoldingRegisters).not.toHaveBeenCalled();
    expect(transport.writeCoils).not.toHaveBeenCalled();
  });

  it("config'te olmayan isim yok sayılır (kademeli bozulma)", async () => {
    const transport = makeTransport();
    const device = new ModbusDevice(
      makeConfig({ bitfieldConfigs: undefined }),
      transport,
    );
    await device.write([point("Tanimsiz", 5)]);
    expect(transport.writeHoldingRegisters).not.toHaveBeenCalled();
  });
});

describe("ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)", () => {
  it("başarılı yazımda backup okur, yazar, rollback ÇAĞRILMAZ", async () => {
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockResolvedValue([230]),
    });
    const device = new ModbusDevice(
      makeConfig({ bitfieldConfigs: undefined }),
      transport,
    );
    await device.writeAtomic([point("Voltage", 700)]);

    expect(transport.readHoldingRegisters).toHaveBeenCalledWith(100, 1);
    expect(transport.writeHoldingRegisters).toHaveBeenCalledWith(100, [700]);
    // rollback yalnızca hata yolunda yazar — tek writeHoldingRegisters çağrısı
    expect(transport.writeHoldingRegisters).toHaveBeenCalledTimes(1);
  });

  it("ikinci grupta hata → ilk grup ESKİ değerine geri yüklenir + orijinal hata fırlar", async () => {
    const writeMock = vi
      .fn()
      .mockResolvedValueOnce(undefined) // grup 1 (adres 100) yazımı başarılı
      .mockRejectedValueOnce(new Error("yazim-hatasi")) // grup 2 (adres 300) başarısız
      .mockResolvedValue(undefined); // rollback yazımı
    const transport = makeTransport({
      // backup okumaları: grup 1 → 230, grup 2 → 500
      readHoldingRegisters: vi.fn().mockImplementation((address: number) =>
        Promise.resolve(address === 100 ? [230] : [500]),
      ),
      writeHoldingRegisters: writeMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "A", registerAddress: 100 }),
        holdingTelemetry({ name: "B", registerAddress: 300 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("A", 700), point("B", 900)]),
    ).rejects.toThrow("yazim-hatasi");

    // rollback: adres 100 ESKİ değer 230 ile yazıldı
    expect(writeMock).toHaveBeenCalledWith(100, [230]);
  });

  it("rollback sırasında hata olursa ORİJİNAL hata fırlar (rollback hatası yutulur)", async () => {
    const writeMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("yazim-hatasi"))
      .mockRejectedValue(new Error("rollback-hatasi"));
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockImplementation((address: number) =>
        Promise.resolve(address === 100 ? [230] : [500]),
      ),
      writeHoldingRegisters: writeMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "A", registerAddress: 100 }),
        holdingTelemetry({ name: "B", registerAddress: 300 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("A", 700), point("B", 900)]),
    ).rejects.toThrow("yazim-hatasi");
  });

  it("COIL yazımı başarılı + holding başarısız → coil ESKİ değerine döner", async () => {
    const writeHoldingMock = vi.fn().mockRejectedValue(new Error("yazim-hatasi"));
    const writeCoilsMock = vi.fn().mockResolvedValue(undefined);
    const transport = makeTransport({
      // COIL backup'u readCoils'tan gelir (ham register backup'ı)
      readCoils: vi.fn().mockResolvedValue([false]),
      readHoldingRegisters: vi.fn().mockResolvedValue([230]),
      writeHoldingRegisters: writeHoldingMock,
      writeCoils: writeCoilsMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "Enable",
          registerAddress: 200,
          registerTableType: "COIL",
        }),
        holdingTelemetry({ name: "A", registerAddress: 100 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("Enable", 1), point("A", 700)]),
    ).rejects.toThrow("yazim-hatasi");

    // coil önce yazıldı, sonra holding patladı → coil rollback: eski 0 → false
    expect(writeCoilsMock).toHaveBeenNthCalledWith(1, 200, [true]);
    expect(writeCoilsMock).toHaveBeenNthCalledWith(2, 200, [false]);
  });

  it("FLOAT32 değerleri BE register çifti olarak yazılır ve rollback round-trip korunur", async () => {
    const writeMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("yazim-hatasi"))
      .mockResolvedValue(undefined);
    const transport = makeTransport({
      // backup: FLOAT32 23.5 → BE register çifti [16828, 0]
      readHoldingRegisters: vi.fn().mockImplementation((address: number) =>
        Promise.resolve(address === 400 ? [16828, 0] : [500]),
      ),
      writeHoldingRegisters: writeMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "FloatA",
          registerAddress: 400,
          registerDataType: "FLOAT32",
        }),
        holdingTelemetry({ name: "B", registerAddress: 300 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("FloatA", 23.5), point("B", 900)]),
    ).rejects.toThrow("yazim-hatasi");

    expect(writeMock).toHaveBeenNthCalledWith(1, 400, [16828, 0]);
    // rollback: FLOAT32 23.5 → aynı register çifti (3. çağrı — 2. çağrı B yazımıydı)
    expect(writeMock).toHaveBeenNthCalledWith(2, 300, [900]);
    expect(writeMock).toHaveBeenNthCalledWith(3, 400, [16828, 0]);
  });

  it("yalnızca INPUT_REGISTER girdi → no-op (backup dahi okunmaz)", async () => {
    const transport = makeTransport();
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "InputOnly",
          registerAddress: 500,
          registerTableType: "INPUT_REGISTER",
        }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await device.writeAtomic([point("InputOnly", 42)]);

    expect(transport.writeHoldingRegisters).not.toHaveBeenCalled();
    expect(transport.writeCoils).not.toHaveBeenCalled();
    expect(transport.readHoldingRegisters).not.toHaveBeenCalled();
  });
});

describe("ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)", () => {
  it("bitişik adresler priority farkına rağmen tek istekte okunur", async () => {
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockResolvedValue([1, 2]),
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "B", registerAddress: 100, priority: 0 }),
        holdingTelemetry({ name: "A", registerAddress: 101, priority: 3 }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    await device.read();

    expect(transport.readHoldingRegisters).toHaveBeenCalledTimes(1);
    expect(transport.readHoldingRegisters).toHaveBeenCalledWith(100, 2);
  });

  it("okuma sırası: HOLDING, INPUT, COIL, DISCRETE, bitfield", async () => {
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockResolvedValue([230]),
      readInputRegisters: vi.fn().mockResolvedValue([5]),
      readCoils: vi.fn().mockResolvedValue([true]),
      readDiscreteInputs: vi.fn().mockResolvedValue([false]),
    });
    const config = makeConfig({
      telemetryList: [
        holdingTelemetry({ name: "Door", registerAddress: 400, registerTableType: "DISCRETE_INPUT" }),
        holdingTelemetry({ name: "Temp", registerAddress: 200, registerTableType: "INPUT_REGISTER" }),
        holdingTelemetry({ name: "Enable", registerAddress: 300, registerTableType: "COIL" }),
        holdingTelemetry({ name: "Voltage", registerAddress: 100 }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    const results = await device.read();

    expect(results.map((t) => t.name)).toEqual([
      "Voltage",
      "Temp",
      "Enable",
      "Door",
      "BSC Alarm",
    ]);
  });

  it("coil/discrete okumalarında sıra korunur", async () => {
    const transport = makeTransport({
      readCoils: vi.fn().mockImplementation((address: number) =>
        Promise.resolve(address === 300 ? [true] : [false]),
      ),
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "C1", registerAddress: 300, registerTableType: "COIL" }),
        holdingTelemetry({ name: "C2", registerAddress: 301, registerTableType: "COIL" }),
        holdingTelemetry({ name: "C3", registerAddress: 302, registerTableType: "COIL" }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    const results = await device.read();

    expect(results.map((t) => t.name)).toEqual(["C1", "C2", "C3"]);
    expect(results.map((t) => t.value)).toEqual([1, 0, 0]);
    expect(transport.readCoils).toHaveBeenCalledTimes(3);
  });

  it("tüm sonuçlar aynı poll timestamp'ini taşır", async () => {
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockResolvedValue([1, 2]),
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "A", registerAddress: 100 }),
        holdingTelemetry({ name: "B", registerAddress: 101 }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    const results = await device.read();

    expect(new Set(results.map((t) => t.timestamp)).size).toBe(1);
  });

  it("yalnızca bitfield'lı cihazda read() bitfield sonuçlarını döner", async () => {
    const transport = makeTransport({
      readInputRegisters: vi.fn().mockResolvedValue([0b101]),
    });
    const config = makeConfig({ telemetryList: [] });
    const device = new ModbusDevice(config, transport);
    const results = await device.read();

    expect(results.map((t) => t.name)).toEqual(["BSC Alarm"]);
    expect(results[0]?.value).toBe(1);
  });

  it("aynı isimli girdilerde tag alt küme eşleşmesi doğru olanı seçer", async () => {
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockResolvedValue([7]),
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "Rack SOC",
          registerAddress: 100,
          tags: { rack_id: "1" },
        }),
        holdingTelemetry({
          name: "Rack SOC",
          registerAddress: 101,
          tags: { rack_id: "2" },
        }),
      ],
    });
    const device = new ModbusDevice(config, transport);
    const results = await device.read([
      {
        deviceId: "bsc-1",
        name: "Rack SOC",
        description: "x",
        value: 0,
        unit: "%",
        timestamp: "",
        tags: { rack_id: "2" },
      },
    ]);

    expect(transport.readHoldingRegisters).toHaveBeenCalledWith(101, 1);
    expect(results).toHaveLength(1);
  });

  it("32-bit tam genişlik bitfield doğru çözülür", async () => {
    const transport = makeTransport({
      readInputRegisters: vi.fn().mockResolvedValue([0xabcd, 0x1234]),
    });
    const config = makeConfig({
      bitfieldConfigs: [
        {
          registerAddress: 30037,
          registerType: "INPUT_REGISTER",
          fields: [
            {
              bitStart: 0,
              bitEnd: 31,
              name: "BigWord",
              dataTag: "big",
              description: "32 bitlik kelime",
              unit: "-",
            },
          ],
        },
      ],
      telemetryList: [],
    });
    const device = new ModbusDevice(config, transport);
    const results = await device.read();

    const big = results.find((t) => t.name === "BigWord");
    expect(big?.value).toBe(0x1234abcd);
  });
});

describe("ModbusDevice config doğrulaması (Faz C)", () => {
  it("bitfield bit aralığı 31 üstü reddedilir", () => {
    expect(() =>
      new ModbusDevice(
        makeConfig({
          bitfieldConfigs: [
            {
              registerAddress: 30037,
              registerType: "INPUT_REGISTER",
              fields: [
                {
                  bitStart: 0,
                  bitEnd: 32,
                  name: "X",
                  dataTag: "x",
                  description: "x",
                  unit: "-",
                },
              ],
            },
          ],
        }),
        makeTransport(),
      ),
    ).toThrow("bit aralığı geçersiz");
  });

  it("bitEnd < bitStart reddedilir", () => {
    expect(() =>
      new ModbusDevice(
        makeConfig({
          bitfieldConfigs: [
            {
              registerAddress: 30037,
              registerType: "INPUT_REGISTER",
              fields: [
                {
                  bitStart: 5,
                  bitEnd: 3,
                  name: "X",
                  dataTag: "x",
                  description: "x",
                  unit: "-",
                },
              ],
            },
          ],
        }),
        makeTransport(),
      ),
    ).toThrow("bit aralığı geçersiz");
  });

  it("bitfield registerType COIL reddedilir", () => {
    expect(() =>
      new ModbusDevice(
        makeConfig({
          bitfieldConfigs: [
            {
              registerAddress: 30037,
              registerType: "COIL" as never,
              fields: [
                {
                  bitStart: 0,
                  bitEnd: 0,
                  name: "X",
                  dataTag: "x",
                  description: "x",
                  unit: "-",
                },
              ],
            },
          ],
        }),
        makeTransport(),
      ),
    ).toThrow("registerType desteklenmiyor");
  });
});

describe("ModbusDevice writeAtomic ham backup (Faz C)", () => {
  it("COIL backup'u readCoils'tan okunur; aynı adresli HOLDING ile karışmaz", async () => {
    const writeHoldingMock = vi.fn().mockRejectedValue(new Error("yazim-hatasi"));
    const writeCoilsMock = vi.fn().mockResolvedValue(undefined);
    const transport = makeTransport({
      readCoils: vi.fn().mockResolvedValue([false]),
      readHoldingRegisters: vi.fn().mockResolvedValue([230]),
      writeHoldingRegisters: writeHoldingMock,
      writeCoils: writeCoilsMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({
          name: "Enable",
          registerAddress: 150,
          registerTableType: "COIL",
        }),
        holdingTelemetry({ name: "Power", registerAddress: 150 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("Enable", 1), point("Power", 700)]),
    ).rejects.toThrow("yazim-hatasi");

    // COIL backup'u readCoils'tan geldi
    expect(transport.readCoils).toHaveBeenCalledWith(150, 1);
    // COIL yazıldı, sonra holding patladı → coil rollback ham backup [false]
    expect(writeCoilsMock).toHaveBeenNthCalledWith(1, 150, [true]);
    expect(writeCoilsMock).toHaveBeenNthCalledWith(2, 150, [false]);
  });

  it("rollback ham register'ları aynen geri yazar (float kayma yok)", async () => {
    const writeMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("yazim-hatasi"))
      .mockResolvedValue(undefined);
    const transport = makeTransport({
      readHoldingRegisters: vi.fn().mockImplementation((address: number) =>
        Promise.resolve(address === 100 ? [46] : [500]),
      ),
      writeHoldingRegisters: writeMock,
    });
    const config = makeConfig({
      bitfieldConfigs: undefined,
      telemetryList: [
        holdingTelemetry({ name: "P1", registerAddress: 100, scale: 0.1 }),
        holdingTelemetry({ name: "P2", registerAddress: 300 }),
      ],
    });
    const device = new ModbusDevice(config, transport);

    await expect(
      device.writeAtomic([point("P1", 4.6), point("P2", 900)]),
    ).rejects.toThrow("yazim-hatasi");

    // yazım: 4.6 / 0.1 → 46 (tam sayıya yuvarlanır)
    expect(writeMock).toHaveBeenNthCalledWith(1, 100, [46]);
    // rollback: ham backup [46] aynen geri yazılır — decode/encode yok
    expect(writeMock).toHaveBeenNthCalledWith(3, 100, [46]);
  });
});

describe("ModbusDevice yazma limiti (Faz C)", () => {
  it("125 register üstü yazma grubu reddedilir", async () => {
    const transport = makeTransport();
    const entries = Array.from({ length: 63 }, (_, i) =>
      holdingTelemetry({
        name: `R${i}`,
        registerAddress: 100 + i * 2,
        registerDataType: "UINT32",
      }),
    );
    const config = makeConfig({ bitfieldConfigs: undefined, telemetryList: entries });
    const device = new ModbusDevice(config, transport);

    const points = entries.map((e) => point(e.name, 1));
    await expect(device.write(points)).rejects.toThrow(
      "Batch too large: 126 registers > max 125",
    );
  });
});

describe("ModbusDevice bağlantı cooldown (mevcut davranış karakterizasyonu)", () => {
  it("kopuk bağlantıda reconnect dener; 10 sn içinde ikinci deneme reddedilir", async () => {
    vi.useFakeTimers({ now: 1_720_000_000_000 });
    try {
      const transport = makeTransport({
        isConnected: vi.fn().mockReturnValue(false),
      });
      const config = makeConfig({ bitfieldConfigs: undefined });
      const device = new ModbusDevice(config, transport);

      await device.read();
      expect(transport.reconnect).toHaveBeenCalledTimes(1);

      // cooldown içinde: hata fırlar, reconnect TEKRARLANMAZ
      await expect(device.read()).rejects.toThrow("reconnect cooldown active");
      expect(transport.reconnect).toHaveBeenCalledTimes(1);

      // cooldown dolunca yeniden denenir
      vi.advanceTimersByTime(10001);
      await device.read();
      expect(transport.reconnect).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
