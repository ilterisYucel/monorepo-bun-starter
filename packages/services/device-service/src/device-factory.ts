import { ModbusDevice, CANBusDevice, MQTTDevice } from "@gd-monorepo/core";
import type {
  IDevice,
  IModbusSimulatorAdapter,
  ModbusTelemetryData,
  DeviceConfigFile,
  TelemetryConfigEntry,
} from "@gd-monorepo/shared-types";
import type { SimulatorProvider } from "./simulator-provider";

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

    const connection = config.connection as {
      host: string;
      port: number;
      slaveId?: number;
      timeout?: number;
    };

    return new ModbusDevice(
      {
        id: config.deviceId,
        name: config.name,
        manufacturer: config.manufacturer,
        model: config.model,
        connection,
        telemetryList,
        bitfieldConfigs: config.bitfieldConfigs,
      },
      adapter,
    );
  }

  private toModbusTelemetry(
    deviceId: string,
    entry: TelemetryConfigEntry,
  ): ModbusTelemetryData {
    const modbus = entry as Omit<
      ModbusTelemetryData,
      "value" | "timestamp" | "deviceId" | "tags"
    >;

    return {
      ...modbus,
      value: 0,
      timestamp: new Date().toISOString(),
      deviceId,
    };
  }
}
