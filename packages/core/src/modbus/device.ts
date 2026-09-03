// packages/core/src/modbus/device.ts

import type { TelemetryData, ModbusTelemetryData, ByteOrder, BitfieldConfig, IDevice } from "@gd-monorepo/shared-types";
import type { IModbusTransport } from "./transport/interface";
import { ModbusClientTransport } from "./transport/modbus-client-transport";
import { ModbusTcpClient } from "./client";
import { BinaryPayloadDecoder } from "./decoder";

export interface ModbusDeviceConfig {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  connection: {
    host?: string;
    port?: number;
    slaveId?: number;
    timeout?: number;
    path?: string;
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    interface?: "tcp" | "rtu";
  };
  telemetryList: ModbusTelemetryData[];
  bitfieldConfigs?: BitfieldConfig[];
  parallelRead?: boolean;
  parallelWrite?: boolean;
}

/** writeAtomic planlanan tek bir yazma işlemi (ham register değerleriyle). */
interface PlannedWrite {
  tableType: "HOLDING_REGISTER" | "COIL";
  address: number;
  registers: number[];
}

/**
 * ModbusDevice — Modbus cihaz soyutlaması (IDevice, ISP uyumlu).
 *
 * Sözleşme:
 * - read(): her zaman cihazın TÜM telemetrisini döner — register telemetrileri
 *   (tip sırası: HOLDING, INPUT, COIL, DISCRETE) + bitfield çıktıları. Çağırana
 *   alt küme verilirse yalnızca o girdiler okunur; bitfield'lar yine eklenir.
 *   Okuma tip içinde ADRESE göre sıralanır (batch maksimizasyonu); priority
 *   okumada kullanılmaz.
 * - write()/writeAtomic(): priority YALNIZCA yazma sırası içindir (0 en yüksek
 *   — bazı cihazlarda x'i yazmadan önce y'yi yazmak gerekebilir).
 * - writeAtomic: önce ham register backup'ı (COIL → readCoils, HOLDING →
 *   readHoldingRegisters, paralel) → planlanan yazılar sırayla → hata olursa
 *   yazılanlar ham backup'la geri yüklenir; ORİJİNAL hata yeniden fırlatılır;
 *   rollback'in kendi hatası yutulur (konsola yazılır).
 *
 * Hata kategorileri (beklenen — throw):
 * - `reconnect cooldown active` — kopuk bağlantıda 10 sn içinde ikinci deneme.
 * - `Batch too large: N registers > max 125` — okuma/yazma grubu limit aşımı.
 * - Config doğrulama hatası (constructor): bitfield bit aralığı 0-31,
 *   bitEnd >= bitStart, registerType yalnızca HOLDING_REGISTER/INPUT_REGISTER.
 * - `Not connected` — taşıma katmanından yükselir.
 *
 * Limitler:
 * - Tek Modbus isteği ≤ 125 register.
 * - Bitfield alanı ≤ 32 bit (en fazla 2 register okunur).
 * - Yazma yalnızca HOLDING_REGISTER + COIL tiplerine yapılır; INPUT/DISCRETE
 *   girdileri sessizce atlanır.
 *
 * Yan etkiler: tüm I/O transport üzerinden. `parallelRead: false` /
 * `parallelWrite: true` config bayrakları paralellik kapağıdır.
 */
export class ModbusDevice implements IDevice {
  private readonly config: ModbusDeviceConfig;

  get id(): string { return this.config.id; }
  private readonly transport: IModbusTransport;
  private readonly MAX_REGISTERS_PER_REQUEST = 125;
  private lastReconnectAttempt: number = 0;
  private readonly reconnectCooldownMs: number = 10000;
  /** İsim → aynı isimli config girdileri (constructor'da bir kez kurulur). */
  private readonly telemetryIndex: Map<string, ModbusTelemetryData[]>;

  constructor(
    config: ModbusDeviceConfig,
    transport?: IModbusTransport,
  ) {
    this.config = config;
    this.transport =
      transport ??
      new ModbusClientTransport(
        new ModbusTcpClient({
          host: config.connection.host ?? "127.0.0.1",
          port: config.connection.port ?? 502,
          slaveId: config.connection.slaveId,
          timeout: config.connection.timeout,
        }),
      );
    this.validateBitfieldConfigs(config.bitfieldConfigs);
    this.telemetryIndex = this.buildTelemetryIndex(config.telemetryList);
  }

  private async ensureConnected(): Promise<void> {
    if (this.transport.isConnected()) return;
    const now = Date.now();
    if (now - this.lastReconnectAttempt < this.reconnectCooldownMs) {
      throw new Error(`Modbus device ${this.config.id} disconnected, reconnect cooldown active`);
    }
    this.lastReconnectAttempt = now;
    console.log(`[ModbusDevice] ${this.config.id} baglanti koptu, yeniden baglaniliyor...`);
    await this.transport.reconnect();
  }

  /** Cihaza bağlanır (taşıma katmanı üzerinden). */
  async connect(): Promise<void> {
    await this.transport.connect();
  }

  /** Cihaz bağlantısını kapatır (taşıma katmanı üzerinden). */
  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  // ============================================
  // PUBLIC API - TelemetryData[] girdi/çıktı
  // ============================================

  /**
   * Cihazın telemetrisini okur.
   *
   * - `telemetries` boşsa config'teki TÜM register telemetrileri okunur.
   * - Verilen alt küme config'te yoksa o girdiler yok sayılır.
   * - Bitfield çıktıları her durumda sonuçlara EKLENİR (ISP: bitfield okuması
   *   cihazın kendi stratejisidir).
   * - Sonuç sırası: HOLDING, INPUT, COIL, DISCRETE (her biri adres sıralı),
   *   ardından bitfield çıktıları.
   */
  async read(telemetries?: TelemetryData[]): Promise<TelemetryData[]> {
    await this.ensureConnected();
    let itemsToRead = telemetries;
    if (!itemsToRead || itemsToRead.length === 0) {
      itemsToRead = this.config.telemetryList;
    }

    const modbusTelemetries = this.toModbusTelemetryList(itemsToRead);

    const holdingList = this.sortByAddress(
      modbusTelemetries.filter(
        (t) => t.registerTableType === "HOLDING_REGISTER",
      ),
    );
    const inputList = this.sortByAddress(
      modbusTelemetries.filter(
        (t) => t.registerTableType === "INPUT_REGISTER",
      ),
    );
    const coilList = this.sortByAddress(
      modbusTelemetries.filter((t) => t.registerTableType === "COIL"),
    );
    const discreteList = this.sortByAddress(
      modbusTelemetries.filter(
        (t) => t.registerTableType === "DISCRETE_INPUT",
      ),
    );

    const timestamp = new Date().toISOString();

    const [
      holdingResults,
      inputResults,
      coilResults,
      discreteResults,
      bitfieldResults,
    ] = await Promise.all([
      holdingList.length > 0
        ? this._readBatchByType(holdingList, "HOLDING", timestamp)
        : Promise.resolve([] as TelemetryData[]),
      inputList.length > 0
        ? this._readBatchByType(inputList, "INPUT", timestamp)
        : Promise.resolve([] as TelemetryData[]),
      coilList.length > 0
        ? this._readCoilBatch(coilList, timestamp)
        : Promise.resolve([] as TelemetryData[]),
      discreteList.length > 0
        ? this._readDiscreteBatch(discreteList, timestamp)
        : Promise.resolve([] as TelemetryData[]),
      // ISP (Faz 0 eki): bitfield okuması cihazın KENDİ stratejisidir —
      // read() her zaman cihazın TÜM telemetrisini döner.
      this.readBitfieldTelemetry(),
    ]);

    return [
      ...holdingResults,
      ...inputResults,
      ...coilResults,
      ...discreteResults,
      ...bitfieldResults,
    ];
  }

  private async readBitfieldTelemetry(): Promise<TelemetryData[]> {
    const configs = this.config.bitfieldConfigs;
    if (!configs || configs.length === 0) return [];

    const byAddress = new Map<string, BitfieldConfig[]>();
    for (const cfg of configs) {
      const key = `${cfg.registerType}:${cfg.registerAddress}`;
      if (!byAddress.has(key)) byAddress.set(key, []);
      byAddress.get(key)!.push(cfg);
    }

    const now = new Date().toISOString();

    const groupResults = await Promise.all(
      [...byAddress.values()].map((group) =>
        this.readBitfieldGroup(group, now),
      ),
    );
    return groupResults.flat();
  }

  private async readBitfieldGroup(
    group: BitfieldConfig[],
    now: string,
  ): Promise<TelemetryData[]> {
    const first = group[0]!;
    const maxEndBit = Math.max(
      ...group.flatMap((c) => c.fields.map((f) => f.bitEnd)),
    );
    const registerCount = maxEndBit >= 16 ? 2 : 1;

    const rawValues =
      first.registerType === "HOLDING_REGISTER"
        ? await this.transport.readHoldingRegisters(
            first.registerAddress,
            registerCount,
          )
        : await this.transport.readInputRegisters(
            first.registerAddress,
            registerCount,
          );

    const combined =
      (rawValues[0] ?? 0) | ((rawValues[1] ?? 0) << 16);

    const results: TelemetryData[] = [];
    for (const cfg of group) {
      for (const field of cfg.fields) {
        const width = field.bitEnd - field.bitStart + 1;
        const mask =
          width === 32
            ? 0xFFFFFFFF
            : ((1 << width) - 1) << field.bitStart;
        const raw =
          width === 32
            ? combined >>> 0
            : (combined & mask) >>> field.bitStart;
        const scale = field.scale ?? 1;
        const offset = field.offset ?? 0;
        const value = raw * scale + offset;

        const configTags: Record<string, string> = {
          dataTag: field.dataTag,
          ...(field.canonical ? { canonical: field.canonical } : undefined),
          ...(cfg.tags ?? undefined),
          ...(field.tags ?? undefined),
        };

        results.push({
          name: field.name,
          description: field.description,
          value,
          unit: field.unit,
          timestamp: now,
          deviceId: this.config.id,
          tags: configTags,
        });
      }
    }

    return results;
  }

  /**
   * Telemetrileri cihaza yazar.
   *
   * - Yalnızca HOLDING_REGISTER + COIL girdileri yazılır; diğer tipler
   *   sessizce atlanır.
   * - Grup sırası priority'ye göredir (0 en yüksek) — bazı cihazlarda
   *   yazma sırası önemlidir.
   * - Boş girdi veya config'te olmayan isimler no-op'tur.
   */
  async write(telemetries: TelemetryData[]): Promise<void> {
    if (telemetries.length === 0) return;

    const modbusTelemetries = this.toModbusTelemetryList(telemetries);
    if (modbusTelemetries.length === 0) return;

    const sorted = this.sortByPriority(modbusTelemetries);

    const holdingList = sorted.filter(
      (t) => t.registerTableType === "HOLDING_REGISTER",
    );
    const coilList = sorted.filter((t) => t.registerTableType === "COIL");

    if (holdingList.length > 0) {
      await this._writeBatchByType(holdingList);
    }
    if (coilList.length > 0) {
      await coilList.reduce(async (chain, telemetry) => {
        await chain;
        const rawValue =
          ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
        await this.transport.writeCoils(
          telemetry.registerAddress,
          [rawValue !== 0],
        );
      }, Promise.resolve());
    }
  }

  /**
   * Transactional yazma (TEİAŞ #22).
   *
   * - Önce planlanan TÜM yazıların ham backup'ı paralel okunur.
   * - Yazma plan sırasıyla yapılır; herhangi birinde hata olursa yazılanlar
   *   ham backup değerleriyle (decode/encode olmadan) geri yüklenir.
   * - Rollback sırasında oluşan hata yutulur; ORİJİNAL yazma hatası fırlar.
   */
  async writeAtomic(telemetries: TelemetryData[]): Promise<void> {
    if (telemetries.length === 0) return;

    const modbusTelemetries = this.toModbusTelemetryList(telemetries);
    if (modbusTelemetries.length === 0) return;

    const sorted = this.sortByPriority(modbusTelemetries);
    const writableList = sorted.filter(
      (t) =>
        t.registerTableType === "HOLDING_REGISTER" ||
        t.registerTableType === "COIL",
    );

    if (writableList.length === 0) return;

    const coilList = writableList.filter(
      (t) => t.registerTableType === "COIL",
    );
    const holdingList = writableList.filter(
      (t) => t.registerTableType === "HOLDING_REGISTER",
    );

    // ============================================
    // 1. Plan: yazma sırası korunur (önce COIL'ler, sonra HOLDING grupları)
    // ============================================

    const planned: PlannedWrite[] = [];
    for (const telemetry of coilList) {
      const rawValue =
        ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
      planned.push({
        tableType: "COIL",
        address: telemetry.registerAddress,
        registers: [rawValue !== 0 ? 1 : 0],
      });
    }
    for (const group of this.groupByAddress(holdingList)) {
      const encoded = this.encodeGroup(group);
      planned.push({
        tableType: "HOLDING_REGISTER",
        address: encoded.address,
        registers: encoded.registers,
      });
    }

    // ============================================
    // 2. Backup: ham register'lar paralel okunur
    // ============================================

    const backups = new Map<number, number[]>();
    await Promise.all(
      planned.map(async (write, index) => {
        if (write.tableType === "HOLDING_REGISTER") {
          const registers = await this.transport.readHoldingRegisters(
            write.address,
            write.registers.length,
          );
          backups.set(index, registers);
        } else {
          const values = await this.transport.readCoils(write.address, 1);
          backups.set(index, [values[0] ? 1 : 0]);
        }
      }),
    );

    // ============================================
    // 3. Yazma işlemi
    // ============================================

    const executed: number[] = [];

    try {
      for (const [index, write] of planned.entries()) {
        if (write.tableType === "COIL") {
          await this.transport.writeCoils(
            write.address,
            [write.registers[0] === 1],
          );
        } else {
          await this.transport.writeHoldingRegisters(
            write.address,
            write.registers,
          );
        }
        executed.push(index);
      }
    } catch (error) {
      // ============================================
      // 4. Rollback: yazılanlar ham backup ile geri yüklenir
      // ============================================
      console.error(
        "[ModbusDevice] Atomic write failed, rolling back...",
        error,
      );

      await executed.reduce(async (chain, index) => {
        await chain;
        const write = planned[index]!;
        const raw = backups.get(index);
        if (raw === undefined) return;
        try {
          if (write.tableType === "COIL") {
            await this.transport.writeCoils(
              write.address,
              [raw[0] === 1],
            );
          } else {
            await this.transport.writeHoldingRegisters(
              write.address,
              raw,
            );
          }
        } catch (rollbackError) {
          console.error(
            `[ModbusDevice] Rollback failed for address ${write.address}:`,
            rollbackError,
          );
        }
      }, Promise.resolve());

      throw error;
    }
  }

  // ============================================
  // PRIVATE BATCH METHODS BY TABLE TYPE
  // ============================================

  private async _readBatchByType(
    telemetries: ModbusTelemetryData[],
    type: "HOLDING" | "INPUT",
    timestamp: string,
  ): Promise<TelemetryData[]> {
    const groups = this.groupByAddress(telemetries);

    if (this.config.parallelRead !== false) {
      const groupResults = await Promise.all(
        groups.map((group) => this._readGroupByType(group, type, timestamp)),
      );
      return groupResults.flat();
    }

    const results: TelemetryData[] = [];
    await groups.reduce(async (chain, group) => {
      await chain;
      results.push(...(await this._readGroupByType(group, type, timestamp)));
    }, Promise.resolve());
    return results;
  }

  private async _readGroupByType(
    telemetries: ModbusTelemetryData[],
    type: "HOLDING" | "INPUT",
    timestamp: string,
  ): Promise<TelemetryData[]> {
    if (telemetries.length === 0) return [];

    const startAddress = telemetries[0]!.registerAddress;
    const lastTelemetry = telemetries.at(-1)!;
    const endAddress =
      lastTelemetry.registerAddress +
      BinaryPayloadDecoder.getRegisterCount(lastTelemetry.registerDataType) -
      1;
    const totalRegisters = endAddress - startAddress + 1;

    if (totalRegisters > this.MAX_REGISTERS_PER_REQUEST) {
      throw new Error(
        `Batch too large: ${totalRegisters} registers > max ${this.MAX_REGISTERS_PER_REQUEST}`,
      );
    }

    const registers =
      type === "HOLDING"
        ? await this.transport.readHoldingRegisters(
            startAddress,
            totalRegisters,
          )
        : await this.transport.readInputRegisters(startAddress, totalRegisters);

    const results: TelemetryData[] = [];
    let offset = 0;
    for (const telemetry of telemetries) {
      const count = BinaryPayloadDecoder.getRegisterCount(
        telemetry.registerDataType,
      );

      const rawValue = this._decodeRegisters(
        registers.slice(offset, offset + count),
        telemetry,
      );
      const value = rawValue * telemetry.scale + telemetry.offset;
      results.push(this._toTelemetryData(telemetry, value, timestamp));
      offset += count;
    }

    return results;
  }

  private async _readCoilBatch(
    telemetries: ModbusTelemetryData[],
    timestamp: string,
  ): Promise<TelemetryData[]> {
    return Promise.all(
      telemetries.map(async (telemetry) => {
        const values = await this.transport.readCoils(
          telemetry.registerAddress,
          1,
        );
        const value = values[0] ?? false;
        return this._toTelemetryData(telemetry, value ? 1 : 0, timestamp);
      }),
    );
  }

  private async _readDiscreteBatch(
    telemetries: ModbusTelemetryData[],
    timestamp: string,
  ): Promise<TelemetryData[]> {
    return Promise.all(
      telemetries.map(async (telemetry) => {
        const values = await this.transport.readDiscreteInputs(
          telemetry.registerAddress,
          1,
        );
        const value = values[0] ?? false;
        return this._toTelemetryData(telemetry, value ? 1 : 0, timestamp);
      }),
    );
  }

  private async _writeBatchByType(
    telemetries: ModbusTelemetryData[],
  ): Promise<void> {
    const groups = this.groupByAddress(telemetries);

    if (this.config.parallelWrite === true) {
      await Promise.all(groups.map((group) => this.writeHoldingGroup(group)));
    } else {
      await groups.reduce(async (chain, group) => {
        await chain;
        await this.writeHoldingGroup(group);
      }, Promise.resolve());
    }
  }

  // ============================================
  // CORE ENCODE/DECODE METHODS
  // ============================================

  /** Grubu ham register dizisine kodlar; 125 register limitini denetler. */
  private encodeGroup(
    telemetries: ModbusTelemetryData[],
  ): { address: number; registers: number[] } {
    const registerValues: number[] = [];

    for (const telemetry of telemetries) {
      const rawValue =
        ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
      const registerCount = BinaryPayloadDecoder.getRegisterCount(
        telemetry.registerDataType,
      );

      const buffer = Buffer.alloc(registerCount * 2);
      this.writeEncodedValue(buffer, telemetry.registerDataType, rawValue);
      this.applyByteOrderToBuffer(buffer, telemetry.byteOrder);

      for (let i = 0; i < buffer.length; i += 2) {
        registerValues.push(buffer.readUInt16BE(i));
      }
    }

    if (registerValues.length > this.MAX_REGISTERS_PER_REQUEST) {
      throw new Error(
        `Batch too large: ${registerValues.length} registers > max ${this.MAX_REGISTERS_PER_REQUEST}`,
      );
    }

    return {
      address: telemetries[0]!.registerAddress,
      registers: registerValues,
    };
  }

  /** Tam sayı tipleri için raw değeri yuvarlar (float bölüm kaymasını önler). */
  private writeEncodedValue(
    buffer: Buffer,
    registerDataType: ModbusTelemetryData["registerDataType"],
    rawValue: number,
  ): void {
    switch (registerDataType) {
      case "UINT16":
        buffer.writeUInt16BE(Math.round(rawValue), 0);
        break;
      case "INT16":
        buffer.writeInt16BE(Math.round(rawValue), 0);
        break;
      case "UINT32":
        buffer.writeUInt32BE(Math.round(rawValue), 0);
        break;
      case "INT32":
        buffer.writeInt32BE(Math.round(rawValue), 0);
        break;
      case "FLOAT32":
        buffer.writeFloatBE(rawValue, 0);
        break;
      case "FLOAT64":
        buffer.writeDoubleBE(rawValue, 0);
        break;
      default:
        buffer.writeUInt16BE(Math.round(rawValue), 0);
    }
  }

  /** Bir HOLDING grubunu kodlar ve yazar (limit denetimi dahil). */
  private async writeHoldingGroup(
    telemetries: ModbusTelemetryData[],
  ): Promise<void> {
    if (telemetries.length === 0) return;
    const { address, registers } = this.encodeGroup(telemetries);
    await this.transport.writeHoldingRegisters(address, registers);
  }

  private applyByteOrderToBuffer(buffer: Buffer, byteOrder: ByteOrder): void {
    switch (byteOrder) {
      case "LITTLE_ENDIAN":
        for (let i = 0; i < buffer.length; i += 2) {
          const b0 = buffer[i] as number;
          const b1 = buffer[i + 1] as number;
          buffer[i] = b1;
          buffer[i + 1] = b0;
        }
        break;
      case "BIG_ENDIAN_SWAP":
        for (let i = 0; i < buffer.length; i += 4) {
          const b0 = buffer[i] as number;
          const b1 = buffer[i + 1] as number;
          const b2 = buffer[i + 2] as number;
          const b3 = buffer[i + 3] as number;
          buffer[i] = b2;
          buffer[i + 1] = b3;
          buffer[i + 2] = b0;
          buffer[i + 3] = b1;
        }
        break;
      case "LITTLE_ENDIAN_SWAP":
        for (let i = 0; i < buffer.length; i += 4) {
          const b0 = buffer[i] as number;
          const b1 = buffer[i + 1] as number;
          const b2 = buffer[i + 2] as number;
          const b3 = buffer[i + 3] as number;
          buffer[i] = b1;
          buffer[i + 1] = b0;
          buffer[i + 2] = b3;
          buffer[i + 3] = b2;
        }
        break;
      default:
        break;
    }
  }

  private _decodeRegisters(
    registers: number[],
    telemetry: ModbusTelemetryData,
  ): number {
    const decoder = new BinaryPayloadDecoder(registers, telemetry.byteOrder);
    switch (telemetry.registerDataType) {
      case "UINT16":
        return decoder.decodeUint16();
      case "INT16":
        return decoder.decodeInt16();
      case "UINT32":
        return decoder.decodeUint32();
      case "INT32":
        return decoder.decodeInt32();
      case "FLOAT32":
        return decoder.decodeFloat32();
      case "FLOAT64":
        return decoder.decodeFloat64();
      default:
        return registers[0] ?? 0;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Config telemetrilerini isim indeksler (constructor'da bir kez).
   * Aynı isimli girdiler (farklı tag'lerle) aynı kovada toplanır; arama
   * O(1) hash + k aday arasında tag eşleştirmesine düşer (O(n·k)).
   */
  private buildTelemetryIndex(
    telemetryList: ModbusTelemetryData[],
  ): Map<string, ModbusTelemetryData[]> {
    const index = new Map<string, ModbusTelemetryData[]>();
    for (const entry of telemetryList) {
      const bucket = index.get(entry.name);
      if (bucket) {
        bucket.push(entry);
      } else {
        index.set(entry.name, [entry]);
      }
    }
    return index;
  }

  private toModbusTelemetryList(
    telemetries: TelemetryData[],
  ): ModbusTelemetryData[] {
    const result: ModbusTelemetryData[] = [];
    for (const t of telemetries) {
      const candidates = this.telemetryIndex.get(t.name);
      if (!candidates || candidates.length === 0) {
        console.warn(`[ModbusDevice] No config found for: ${t.name}`, t.tags);
        continue;
      }

      const tTags = t.tags;
      const hasTags = !!tTags && Object.keys(tTags).length > 0;

      const found = hasTags
        ? candidates.find((mt) => {
            const mtTags = mt.tags;
            if (!mtTags) return false;
            return Object.keys(tTags).every(
              (key) => mtTags[key] === tTags[key],
            );
          })
        : candidates[0];

      if (!found) {
        console.warn(`[ModbusDevice] No config found for: ${t.name}`, t.tags);
        continue;
      }

      result.push({
        ...found,
        value: t.value ?? found.value,
      });
    }
    return result;
  }

  /** Yazma sıralaması — priority azalan (0 en yüksek öncelik). */
  private sortByPriority(
    telemetries: ModbusTelemetryData[],
  ): ModbusTelemetryData[] {
    return [...telemetries].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });
  }

  /** Okuma sıralaması — adres artan (batch maksimizasyonu için). */
  private sortByAddress(
    telemetries: ModbusTelemetryData[],
  ): ModbusTelemetryData[] {
    return [...telemetries].sort(
      (a, b) => a.registerAddress - b.registerAddress,
    );
  }

  private groupByAddress(
    telemetries: ModbusTelemetryData[],
  ): ModbusTelemetryData[][] {
    const groups: ModbusTelemetryData[][] = [];
    let currentGroup: ModbusTelemetryData[] = [];

    for (const telemetry of telemetries) {
      if (currentGroup.length === 0) {
        currentGroup.push(telemetry);
        continue;
      }

      const lastTelemetry = currentGroup.at(-1)!;
      const lastEndAddress =
        lastTelemetry.registerAddress +
        BinaryPayloadDecoder.getRegisterCount(lastTelemetry.registerDataType);
      const currentStartAddress = telemetry.registerAddress;

      if (currentStartAddress === lastEndAddress) {
        currentGroup.push(telemetry);
      } else {
        groups.push(currentGroup);
        currentGroup = [telemetry];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private _toTelemetryData(
    telemetry: ModbusTelemetryData,
    value: number,
    timestamp: string,
  ): TelemetryData {
    return {
      name: telemetry.name,
      description: telemetry.description,
      value,
      unit: telemetry.unit,
      timestamp,
      deviceId: this.config.id,
      tags: telemetry.tags,
    } as TelemetryData;
  }

  /** Bitfield config'lerini doğrular — geçersiz config fail-fast hata üretir. */
  private validateBitfieldConfigs(configs?: BitfieldConfig[]): void {
    if (!configs) return;
    for (const cfg of configs) {
      if (
        cfg.registerType !== "HOLDING_REGISTER" &&
        cfg.registerType !== "INPUT_REGISTER"
      ) {
        throw new Error(
          `[ModbusDevice] ${this.config.id}: bitfield registerType desteklenmiyor: ${cfg.registerType} (yalnızca HOLDING_REGISTER/INPUT_REGISTER)`,
        );
      }
      for (const field of cfg.fields) {
        const valid =
          Number.isInteger(field.bitStart) &&
          Number.isInteger(field.bitEnd) &&
          field.bitStart >= 0 &&
          field.bitEnd <= 31 &&
          field.bitEnd >= field.bitStart;
        if (!valid) {
          throw new Error(
            `[ModbusDevice] ${this.config.id}: bitfield bit aralığı geçersiz (${field.name}: bitStart=${field.bitStart}, bitEnd=${field.bitEnd}; beklenen 0-31 ve bitEnd >= bitStart)`,
          );
        }
      }
    }
  }
}
