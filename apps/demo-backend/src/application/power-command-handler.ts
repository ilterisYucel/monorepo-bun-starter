// apps/demo-backend/src/application/handlers/PowerCommandHandler.ts

import { ModbusDevice } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export class PowerCommandHandler {
  constructor(private modbusDevice: ModbusDevice) {}

  // async handleCharge(powerKw: number): Promise<void> {
  //   const telemetries: TelemetryData[] = [
  //     {
  //       name: "ChargeStatus",
  //       description: "Set charge mode",
  //       value: 1, // 1 = Charge
  //       unit: "",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //     {
  //       name: "Power",
  //       description: "Set charge power",
  //       value: powerKw,
  //       unit: "kW",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //   ];

  //   await this.modbusDevice.write(telemetries);
  //   console.log(`[PowerCommandHandler] Charge started with ${powerKw} kW`);
  // }

  // async handleDischarge(powerKw: number): Promise<void> {
  //   const telemetries: TelemetryData[] = [
  //     {
  //       name: "ChargeStatus",
  //       description: "Set discharge mode",
  //       value: 2, // 2 = Discharge
  //       unit: "",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //     {
  //       name: "Power",
  //       description: "Set discharge power",
  //       value: powerKw,
  //       unit: "kW",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //   ];

  //   await this.modbusDevice.write(telemetries);
  //   console.log(`[PowerCommandHandler] Discharge started with ${powerKw} kW`);
  // }

  // async handleStop(): Promise<void> {
  //   const telemetries: TelemetryData[] = [
  //     {
  //       name: "ChargeStatus",
  //       description: "Set idle mode",
  //       value: 0, // 0 = Idle
  //       unit: "",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //     {
  //       name: "Power",
  //       description: "Set power to zero",
  //       value: 0,
  //       unit: "kW",
  //       timestamp: new Date().toISOString(),
  //       deviceId: this.modbusDevice["config"].id,
  //     },
  //   ];

  //   await this.modbusDevice.write(telemetries);
  //   console.log("[PowerCommandHandler] Stop command executed");
  // }
  // PowerCommandHandler.ts

  async handleCharge(powerKw: number): Promise<void> {
    const telemetries: TelemetryData[] = [
      {
        name: "ChargeStatus",
        value: 1, // Charge
        unit: "",
        description: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
      {
        name: "GlobalPower", // 🔥 YENİ: GlobalPower kullan
        value: powerKw,
        unit: "kW",
        description: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
    ];

    await this.modbusDevice.writeAtomic(telemetries);
    console.log(
      `[PowerCommandHandler] Charge started with ${powerKw} kW (global)`,
    );
  }

  async handleDischarge(powerKw: number): Promise<void> {
    const telemetries: TelemetryData[] = [
      {
        name: "ChargeStatus",
        value: 2, // Discharge
        description: "",
        unit: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
      {
        name: "GlobalPower",
        value: powerKw,
        unit: "kW",
        description: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
    ];

    await this.modbusDevice.writeAtomic(telemetries);
    console.log(
      `[PowerCommandHandler] Discharge started with ${powerKw} kW (global)`,
    );
  }

  async handleStop(): Promise<void> {
    const telemetries: TelemetryData[] = [
      {
        name: "ChargeStatus",
        value: 0, // Idle
        unit: "",
        description: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
      {
        name: "GlobalPower",
        value: 0,
        unit: "kW",
        description: "",
        timestamp: new Date().toISOString(),
        deviceId: this.modbusDevice["config"].id,
      },
    ];

    await this.modbusDevice.writeAtomic(telemetries);
    console.log("[PowerCommandHandler] Stop command executed (global)");
  }
}
