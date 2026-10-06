import {
  ModbusDevice,
  CANBusDevice,
  MQTTDevice,
  ModbusRtuClient,
  ModbusClientTransport,
} from "@gd-monorepo/core";
import type { IModbusTransport, ModbusRtuConfig } from "@gd-monorepo/core";
import type {
  IDevice,
  ModbusTelemetryData,
  DeviceConfigFile,
  TelemetryConfigEntry,
} from "@gd-monorepo/shared-types";

/**
 * DeviceFactory — config'ten `IDevice` üretir (yalnız TCP/RTU; simülatör dalı YOK).
 * Connector bölümü varsa `createConnector` ile türetilmiş 2. MODBUS cihazı üretilir.
 */
export class DeviceFactory {
  create(config: DeviceConfigFile): IDevice {
    const transport = this.transportFor(config);

    if (config.protocol === "MODBUS") {
      return new ModbusDevice(this.buildModbusConfig(config), transport);
    }
    if (config.protocol === "CANBUS") {
      return new CANBusDevice(config.deviceId);
    }
    return new MQTTDevice(config.deviceId);
  }

  /** `config.connector.device` varsa türetilmiş connector cihazını üretir. */
  createConnector(config: DeviceConfigFile): IDevice | undefined {
    const subset = config.connector?.device;
    if (subset === undefined) return undefined;
    return new ModbusDevice({
      id: subset.deviceId,
      name: subset.name,
      manufacturer: config.manufacturer,
      model: config.model,
      connection: subset.connection,
      telemetryList: subset.telemetry.map((entry) =>
        this.toModbusTelemetry(subset.deviceId, entry),
      ),
    });
  }

  /**
   * Taşıma katmanı seçimi (Strategy): yalnız RTU özel transport gerektirir;
   * aksi halde undefined → ModbusDevice kendi varsayılan TCP transport'unu kurar.
   */
  private transportFor(config: DeviceConfigFile): IModbusTransport | undefined {
    if (config.transport?.kind === "rtu") {
      const connection = config.connection;
      const rtuConfig: ModbusRtuConfig = {
        path: (connection.path as string) ?? "/dev/ttyUSB0",
        baudRate: (connection.baudRate as number) ?? 19200,
        slaveId: (connection.slaveId as number) ?? 1,
        dataBits: connection.dataBits as (7 | 8) | undefined,
        stopBits: connection.stopBits as (1 | 2) | undefined,
        parity: connection.parity as "none" | "even" | "odd" | undefined,
        timeout: connection.timeout as number | undefined,
      };
      return new ModbusClientTransport(new ModbusRtuClient(rtuConfig));
    }
    return undefined;
  }

  private buildModbusConfig(config: DeviceConfigFile): {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    connection: Record<string, unknown>;
    telemetryList: ModbusTelemetryData[];
    bitfieldConfigs?: DeviceConfigFile["bitfieldConfigs"];
  } {
    const telemetryList: ModbusTelemetryData[] = config.telemetry.map((entry) =>
      this.toModbusTelemetry(config.deviceId, entry),
    );

    return {
      id: config.deviceId,
      name: config.name,
      manufacturer: config.manufacturer,
      model: config.model,
      connection: config.connection,
      telemetryList,
      bitfieldConfigs: config.bitfieldConfigs,
    };
  }

  private toModbusTelemetry(
    deviceId: string,
    entry: TelemetryConfigEntry,
  ): ModbusTelemetryData {
    const modbus = entry as Omit<
      ModbusTelemetryData,
      "value" | "timestamp" | "deviceId"
    >;

    // Konfigürasyondaki canonical alanı tags.canonical olarak taşınır —
    // cihazdan bağımsız semantik eşleme frontend tarafında name'e bağlı kalmaz.
    const tags = entry.canonical
      ? { ...entry.tags, canonical: entry.canonical }
      : entry.tags;

    return {
      ...modbus,
      tags,
      value: 0,
      timestamp: new Date().toISOString(),
      deviceId,
    };
  }
}
