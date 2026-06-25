// packages/core/src/modbus/device.ts

import type {
  TelemetryData,
  ModbusTelemetryData,
  IModbusSimulatorAdapter,
  ByteOrder,
  BitfieldConfig,
  IDevice,
} from "@gd-monorepo/shared-types";
import { ModbusTcpClient } from "./client";
import { BinaryPayloadDecoder } from "./decoder";

export interface ModbusDeviceConfig {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  connection: {
    host: string;
    port: number;
    slaveId?: number;
    timeout?: number;
  };
  telemetryList: ModbusTelemetryData[];
  bitfieldConfigs?: BitfieldConfig[];
  parallelRead?: boolean;
  parallelWrite?: boolean;
}

export class ModbusDevice implements IDevice {
  private config: ModbusDeviceConfig;

  get id(): string { return this.config.id; }
  private client: ModbusTcpClient | null = null;
  private adapter!: IModbusSimulatorAdapter | undefined;
  private isSimulator: boolean;
  private readonly MAX_REGISTERS_PER_REQUEST = 125;

  constructor(config: ModbusDeviceConfig, adapter?: IModbusSimulatorAdapter) {
    this.config = config;
    this.isSimulator = !!adapter;
    if (this.isSimulator) {
      this.adapter = adapter;
    } else {
      this.client = new ModbusTcpClient(config.connection);
    }
  }

  async connect(): Promise<void> {
    if (!this.isSimulator) await this.client!.connect();
  }

  async disconnect(): Promise<void> {
    if (!this.isSimulator) await this.client!.disconnect();
  }

  // ============================================
  // PUBLIC API - TelemetryData[] girdi/çıktı
  // ============================================

  async read(telemetries?: TelemetryData[]): Promise<TelemetryData[]> {
    let itemsToRead = telemetries;
    if (!itemsToRead || itemsToRead.length === 0) {
      itemsToRead = this.config.telemetryList.map((t) => ({
        name: t.name,
        description: t.description,
        value: 0,
        unit: t.unit,
        timestamp: new Date().toISOString(),
        deviceId: this.config.id,
        tags: t.tags,
      }));
    }

    const modbusTelemetries = this.toModbusTelemetryList(itemsToRead);
    if (modbusTelemetries.length === 0) return [];

    const sorted = this.sortByPriority(modbusTelemetries);

    const holdingList = sorted.filter(
      (t) => t.registerTableType === "HOLDING_REGISTER",
    );
    const inputList = sorted.filter(
      (t) => t.registerTableType === "INPUT_REGISTER",
    );
    const coilList = sorted.filter((t) => t.registerTableType === "COIL");
    const discreteList = sorted.filter(
      (t) => t.registerTableType === "DISCRETE_INPUT",
    );

    const results: TelemetryData[] = [];

    if (holdingList.length > 0) {
      const holdingResults = await this._readBatchByType(
        holdingList,
        "HOLDING",
      );
      results.push(...holdingResults);
    }
    if (inputList.length > 0) {
      const inputResults = await this._readBatchByType(inputList, "INPUT");
      results.push(...inputResults);
    }
    if (coilList.length > 0) {
      const coilResults = await this._readCoilBatch(coilList);
      results.push(...coilResults);
    }
    if (discreteList.length > 0) {
      const discreteResults = await this._readDiscreteBatch(discreteList);
      results.push(...discreteResults);
    }

    return results;
  }

  async readBitfields(): Promise<TelemetryData[]> {
    const configs = this.config.bitfieldConfigs;
    if (!configs || configs.length === 0) return [];

    const byAddress = new Map<string, BitfieldConfig[]>();
    for (const cfg of configs) {
      const key = `${cfg.registerType}:${cfg.registerAddress}`;
      if (!byAddress.has(key)) byAddress.set(key, []);
      byAddress.get(key)!.push(cfg);
    }

    const results: TelemetryData[] = [];
    const now = new Date().toISOString();

    for (const [, group] of byAddress) {
      const first = group[0]!;
      const maxEndBit = Math.max(...group.flatMap(c => c.fields.map((f: { bitEnd: number }) => f.bitEnd)));
      const registerCount = maxEndBit >= 16 ? 2 : 1;

      let rawValues: number[];
      if (this.isSimulator) {
        rawValues = first.registerType === "HOLDING_REGISTER"
          ? await this.adapter!.readHoldingRegisters(first.registerAddress, registerCount)
          : await this.adapter!.readInputRegisters(first.registerAddress, registerCount);
      } else {
        rawValues = first.registerType === "HOLDING_REGISTER"
          ? await this.client!.readHoldingRegisters(first.registerAddress, registerCount)
          : await this.client!.readInputRegisters(first.registerAddress, registerCount);
      }

      const combined = (rawValues[0] ?? 0) | ((rawValues[1] ?? 0) << 16);

      for (const cfg of group) {
        for (const field of cfg.fields) {
          const mask = ((1 << (field.bitEnd - field.bitStart + 1)) - 1) << field.bitStart;
          const raw = (combined & mask) >>> field.bitStart;
          const scale = field.scale ?? 1;
          const offset = field.offset ?? 0;
          const value = raw * scale + offset;

          const configTags: Record<string, string> = { dataTag: field.dataTag, ...(cfg.tags ?? {}), ...(field.tags ?? {}) };

          results.push({
            name: field.name,
            description: field.description,
            value,
            unit: field.unit,
            timestamp: now,
            deviceId: this.config.id,
            tags: configTags,
            ...(field.logType ? { logType: field.logType } : {}),
          });
        }
      }
    }

    return results;
  }

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
      if (this.isSimulator) {
        await Promise.all(
          coilList.map(async (telemetry) => {
            const rawValue = ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
            await this.adapter!.writeCoil(telemetry.registerAddress, rawValue !== 0);
          }),
        );
      } else {
        for (const telemetry of coilList) {
          const rawValue = ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
          await this.client!.writeSingleCoil(telemetry.registerAddress, rawValue !== 0);
        }
      }
    }
  }

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

    // ============================================
    // 1. Backup: Mevcut değerleri oku
    // ============================================

    const groups = this.groupByAddress(writableList);
    const backups: Map<number, number> = new Map();

    for (const group of groups) {
      const startAddress = group[0]!.registerAddress;
      const lastTelemetry = group[group.length - 1]!;
      const endAddress =
        lastTelemetry.registerAddress +
        BinaryPayloadDecoder.getRegisterCount(lastTelemetry.registerDataType) -
        1;
      const totalRegisters = endAddress - startAddress + 1;

      let registers: number[];
      if (this.isSimulator) {
        registers = await this.adapter!.readHoldingRegisters(
          startAddress,
          totalRegisters,
        );
      } else {
        registers = await this.client!.readHoldingRegisters(
          startAddress,
          totalRegisters,
        );
      }

      let offset = 0;
      for (const telemetry of group) {
        const count = BinaryPayloadDecoder.getRegisterCount(
          telemetry.registerDataType,
        );
        const rawValue = this._decodeRegisters(
          registers.slice(offset, offset + count),
          telemetry,
        );
        const value = rawValue * telemetry.scale + telemetry.offset;
        backups.set(telemetry.registerAddress, value);
        offset += count;
      }
    }

    // ============================================
    // 2. Yazma işlemi
    // ============================================

    const writtenAddresses: number[] = [];

    try {
      // COIL'leri yaz
      const coilList = writableList.filter(
        (t) => t.registerTableType === "COIL",
      );
      for (const telemetry of coilList) {
        const rawValue =
          ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
        if (this.isSimulator) {
          await this.adapter!.writeCoil(telemetry.registerAddress, rawValue !== 0);
        } else {
          await this.client!.writeSingleCoil(
            telemetry.registerAddress,
            rawValue !== 0,
          );
        }
        writtenAddresses.push(telemetry.registerAddress);
      }

      // HOLDING_REGISTER'ları yaz
      const holdingList = writableList.filter(
        (t) => t.registerTableType === "HOLDING_REGISTER",
      );

      if (holdingList.length > 0) {
        const holdingGroups = this.groupByAddress(holdingList);
        for (const group of holdingGroups) {
          const result = await this._encodeAndWrite(group);
          writtenAddresses.push(...result.writtenAddresses);
        }
      }
    } catch (error) {
      // ============================================
      // 3. Rollback
      // ============================================
      console.error(
        "[ModbusDevice] Atomic write failed, rolling back...",
        error,
      );

      // Build address-to-telemetry map for O(1) rollback lookup
      const writableByAddress = new Map<number, ModbusTelemetryData>();
      for (const t of writableList) {
        const count = BinaryPayloadDecoder.getRegisterCount(t.registerDataType);
        for (let offset = 0; offset < count; offset++) {
          writableByAddress.set(t.registerAddress + offset, t);
        }
      }

      for (const address of writtenAddresses) {
        const oldValue = backups.get(address);
        if (oldValue !== undefined) {
          try {
            const originalTelemetry = writableByAddress.get(address);
            if (originalTelemetry) {
              const rawValue =
                (oldValue - originalTelemetry.offset) / originalTelemetry.scale;
              const registerCount = BinaryPayloadDecoder.getRegisterCount(
                originalTelemetry.registerDataType,
              );
              const buffer = Buffer.alloc(registerCount * 2);

              switch (originalTelemetry.registerDataType) {
                case "UINT16":
                  buffer.writeUInt16BE(rawValue, 0);
                  break;
                case "INT16":
                  buffer.writeInt16BE(rawValue, 0);
                  break;
                case "UINT32":
                  buffer.writeUInt32BE(rawValue, 0);
                  break;
                case "INT32":
                  buffer.writeInt32BE(rawValue, 0);
                  break;
                case "FLOAT32":
                  buffer.writeFloatBE(rawValue, 0);
                  break;
                case "FLOAT64":
                  buffer.writeDoubleBE(rawValue, 0);
                  break;
                default:
                  buffer.writeUInt16BE(rawValue, 0);
              }

              this.applyByteOrderToBuffer(buffer, originalTelemetry.byteOrder);

              const registerValues: number[] = [];
              for (let i = 0; i < buffer.length; i += 2) {
                registerValues.push(buffer.readUInt16BE(i));
              }

              if (originalTelemetry.registerTableType === "HOLDING_REGISTER") {
                if (this.isSimulator) {
                  for (let i = 0; i < registerValues.length; i++) {
                    await this.adapter!.writeHoldingRegister(
                      originalTelemetry.registerAddress + i,
                      registerValues[i]!,
                    );
                  }
                } else {
                  if (registerValues.length === 1) {
                    await this.client!.writeSingleRegister(
                      originalTelemetry.registerAddress,
                      registerValues[0]!,
                    );
                  } else {
                    await this.client!.writeMultipleRegisters(
                      originalTelemetry.registerAddress,
                      registerValues,
                    );
                  }
                }
              } else if (originalTelemetry.registerTableType === "COIL") {
                const boolValue = rawValue !== 0;
                if (this.isSimulator) {
                  await this.adapter!.writeCoil(
                    originalTelemetry.registerAddress,
                    boolValue,
                  );
                } else {
                  await this.client!.writeSingleCoil(
                    originalTelemetry.registerAddress,
                    boolValue,
                  );
                }
              }
            }
          } catch (rollbackError) {
            console.error(
              `[ModbusDevice] Rollback failed for address ${address}:`,
              rollbackError,
            );
          }
        }
      }
      throw error;
    }
  }

  // ============================================
  // PRIVATE BATCH METHODS BY TABLE TYPE
  // ============================================

  private async _readBatchByType(
    telemetries: ModbusTelemetryData[],
    type: "HOLDING" | "INPUT",
  ): Promise<TelemetryData[]> {
    const groups = this.groupByAddress(telemetries);

    if (this.config.parallelRead !== false) {
      const groupResults = await Promise.all(
        groups.map((group) => this._readGroupByType(group, type)),
      );
      return groupResults.flat();
    } else {
      const results: TelemetryData[] = [];
      for (const group of groups) {
        const batchResults = await this._readGroupByType(group, type);
        results.push(...batchResults);
      }
      return results;
    }
  }

  private async _readGroupByType(
    telemetries: ModbusTelemetryData[],
    type: "HOLDING" | "INPUT",
  ): Promise<TelemetryData[]> {
    if (telemetries.length === 0) return [];

    const startAddress = telemetries[0]!.registerAddress;
    const lastTelemetry = telemetries[telemetries.length - 1]!;
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

    let registers: number[];
    if (this.isSimulator) {
      registers =
        type === "HOLDING"
          ? await this.adapter!.readHoldingRegisters(
              startAddress,
              totalRegisters,
            )
          : await this.adapter!.readInputRegisters(
              startAddress,
              totalRegisters,
            );
    } else {
      registers =
        type === "HOLDING"
          ? await this.client!.readHoldingRegisters(
              startAddress,
              totalRegisters,
            )
          : await this.client!.readInputRegisters(startAddress, totalRegisters);
    }

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
      results.push(this._toTelemetryData(telemetry, value));
      offset += count;
    }

    return results;
  }

  private async _readCoilBatch(
    telemetries: ModbusTelemetryData[],
  ): Promise<TelemetryData[]> {
    const results: TelemetryData[] = [];
    for (const telemetry of telemetries) {
      let value: boolean;
      if (this.isSimulator) {
        value = await this.adapter!.readCoil(telemetry.registerAddress);
      } else {
        value = false;
      }
      results.push(this._toTelemetryData(telemetry, value ? 1 : 0));
    }
    return results;
  }

  private async _readDiscreteBatch(
    telemetries: ModbusTelemetryData[],
  ): Promise<TelemetryData[]> {
    const results: TelemetryData[] = [];
    for (const telemetry of telemetries) {
      let value: boolean;
      if (this.isSimulator) {
        value = await this.adapter!.readDiscreteInput(
          telemetry.registerAddress,
        );
      } else {
        value = false;
      }
      results.push(this._toTelemetryData(telemetry, value ? 1 : 0));
    }
    return results;
  }

  private async _writeBatchByType(
    telemetries: ModbusTelemetryData[],
  ): Promise<void> {
    const groups = this.groupByAddress(telemetries);

    if (this.config.parallelWrite === true) {
      await Promise.all(groups.map((group) => this._writeGroup(group)));
    } else {
      for (const group of groups) {
        await this._writeGroup(group);
      }
    }
  }

  private async _writeGroup(telemetries: ModbusTelemetryData[]): Promise<void> {
    if (telemetries.length === 0) return;
    await this._encodeAndWrite(telemetries);
  }

  // ============================================
  // CORE ENCODE/DECODE METHODS
  // ============================================

  private async _encodeAndWrite(
    telemetries: ModbusTelemetryData[],
  ): Promise<{ writtenAddresses: number[]; registerValues: number[] }> {
    if (telemetries.length === 0) {
      return { writtenAddresses: [], registerValues: [] };
    }

    const registerValues: number[] = [];
    const writtenAddresses: number[] = [];

    for (const telemetry of telemetries) {
      const rawValue =
        ((telemetry.value as number) - telemetry.offset) / telemetry.scale;
      const registerCount = BinaryPayloadDecoder.getRegisterCount(
        telemetry.registerDataType,
      );

      const buffer = Buffer.alloc(registerCount * 2);

      switch (telemetry.registerDataType) {
        case "UINT16":
          buffer.writeUInt16BE(rawValue, 0);
          break;
        case "INT16":
          buffer.writeInt16BE(rawValue, 0);
          break;
        case "UINT32":
          buffer.writeUInt32BE(rawValue, 0);
          break;
        case "INT32":
          buffer.writeInt32BE(rawValue, 0);
          break;
        case "FLOAT32":
          buffer.writeFloatBE(rawValue, 0);
          break;
        case "FLOAT64":
          buffer.writeDoubleBE(rawValue, 0);
          break;
        default:
          buffer.writeUInt16BE(rawValue, 0);
      }

      this.applyByteOrderToBuffer(buffer, telemetry.byteOrder);

      for (let i = 0; i < buffer.length; i += 2) {
        const registerValue = buffer.readUInt16BE(i);
        registerValues.push(registerValue);
        writtenAddresses.push(telemetry.registerAddress + i / 2);
      }
    }

    const startAddress = telemetries[0]!.registerAddress;

    if (this.isSimulator) {
      await Promise.all(
        registerValues.map((val, i) =>
          this.adapter!.writeHoldingRegister(startAddress + i, val),
        ),
      );
    } else {
      if (registerValues.length === 1) {
        await this.client!.writeSingleRegister(
          startAddress,
          registerValues[0]!,
        );
      } else {
        await this.client!.writeMultipleRegisters(startAddress, registerValues);
      }
    }

    return { writtenAddresses, registerValues };
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

  private toModbusTelemetryList(
    telemetries: TelemetryData[],
  ): ModbusTelemetryData[] {
    return telemetries
      .map((t) => {
        const found = this.config.telemetryList.find((mt) => {
          if (mt.name !== t.name) return false;

          const mtTags = mt.tags;
          const tTags = t.tags;

          if (!tTags || Object.keys(tTags).length === 0) {
            return !mtTags || Object.keys(mtTags).length === 0;
          }

          if (!mtTags) return false;

          return Object.keys(tTags).every((key) => mtTags[key] === tTags[key]);
        });

        if (!found) {
          console.warn(`[ModbusDevice] No config found for: ${t.name}`, t.tags);
          return null;
        }

        return {
          ...found,
          value: t.value ?? found.value,
        };
      })
      .filter((mt): mt is ModbusTelemetryData => mt !== null);
  }

  private sortByPriority(
    telemetries: ModbusTelemetryData[],
  ): ModbusTelemetryData[] {
    return [...telemetries].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });
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

      const lastTelemetry = currentGroup[currentGroup.length - 1]!;
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
  ): TelemetryData {
    return {
      name: telemetry.name,
      description: telemetry.description,
      value,
      unit: telemetry.unit,
      timestamp: new Date().toISOString(),
      deviceId: this.config.id,
      tags: telemetry.tags,
    } as TelemetryData;
  }
}
