import { ModbusDevice, CANBusDevice, MQTTDevice, ModbusRtuClient } from "@gd-monorepo/core";
import type {
  IDevice,
  IModbusSimulatorAdapter,
  ModbusTelemetryData,
  DeviceConfigFile,
  TelemetryConfigEntry,
} from "@gd-monorepo/shared-types";
import type { SimulatorProvider } from "./simulator-provider";
import type { ModbusRtuConfig } from "@gd-monorepo/core";

export class DeviceFactory {
  constructor(private readonly simulators: SimulatorProvider) {}

  create(config: DeviceConfigFile): IDevice {
    const adapter = this.simulators.adapter(config.deviceId);

    if (config.protocol === "MODBUS") {
      return this.buildModbus(config, adapter);
    }
    if (config.protocol === "CANBUS") {
      return new CANBusDevice(config.deviceId);
    }
    return new MQTTDevice(config.deviceId);
  }

  private buildModbus(
    config: DeviceConfigFile,
    adapter: IModbusSimulatorAdapter | undefined,
  ): ModbusDevice {
    const telemetryList: ModbusTelemetryData[] = config.telemetry.map((entry) =>
      this.toModbusTelemetry(config.deviceId, entry),
    );

    const connection = config.connection as Record<string, unknown>;

    const deviceConfig = {
      id: config.deviceId,
      name: config.name,
      manufacturer: config.manufacturer,
      model: config.model,
      connection: connection as {
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
      },
      telemetryList,
      bitfieldConfigs: config.bitfieldConfigs,
    };

    if (adapter) {
      return new ModbusDevice(deviceConfig, adapter);
    }

    if (connection.interface === "rtu") {
      const rtuConfig: ModbusRtuConfig = {
        path: (connection.path as string) ?? "/dev/ttyUSB0",
        baudRate: (connection.baudRate as number) ?? 19200,
        slaveId: (connection.slaveId as number) ?? 1,
        dataBits: connection.dataBits as (7 | 8) | undefined,
        stopBits: connection.stopBits as (1 | 2) | undefined,
        parity: connection.parity as "none" | "even" | "odd" | undefined,
        timeout: connection.timeout as number | undefined,
      };
      const rtuClient = new ModbusRtuClient(rtuConfig);
      return new ModbusDevice(deviceConfig, undefined, rtuClient);
    }

    return new ModbusDevice(deviceConfig);
  }

  private toModbusTelemetry(
    deviceId: string,
    entry: TelemetryConfigEntry,
  ): ModbusTelemetryData {
    const modbus = entry as Omit<
      ModbusTelemetryData,
      "value" | "timestamp" | "deviceId"
    >;

    return {
      ...modbus,
      value: 0,
      timestamp: new Date().toISOString(),
      deviceId,
    };
  }
}
