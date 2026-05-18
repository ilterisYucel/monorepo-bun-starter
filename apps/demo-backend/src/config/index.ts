// apps/demo-backend/src/config/index.ts

import type { ModbusDeviceConfig } from "@gd-monorepo/core";
import type { ModbusTelemetryData } from "@gd-monorepo/shared-types";

export const RACK_COUNT = 16;
export const RACK_IDS = Array.from(
  { length: RACK_COUNT },
  (_, i) => `rack-${i + 1}`,
);
export const TICK_SECONDS = 5;

export const createModbusConfig = (): ModbusDeviceConfig => ({
  id: "xrack-simulator",
  name: "XRack Simulator",
  manufacturer: "GD-Monorepo",
  model: "XRack-v1",
  connection: { host: "localhost", port: 502, slaveId: 1, timeout: 3000 },
  telemetryList: [
    // Voltage (FLOAT32 = 2 register) - her rack 2 register yer kaplar
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "Voltage",
      description: `Rack ${i + 1} voltage`,
      unit: "V",
      protocol: "MODBUS" as const,
      registerAddress: 40001 + i * 2,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.1,
      offset: 0,
      priority: 1,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // Current (FLOAT32 = 2 register)
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "Current",
      description: `Rack ${i + 1} current`,
      unit: "A",
      protocol: "MODBUS" as const,
      registerAddress: 40101 + i * 2,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.01,
      offset: 0,
      priority: 1,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // SoC (FLOAT32 = 2 register)
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "SoC",
      description: `Rack ${i + 1} state of charge`,
      unit: "%",
      protocol: "MODBUS" as const,
      registerAddress: 40201 + i * 2,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.1,
      offset: 0,
      priority: 2,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // Status (UINT16 = 1 register)
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "Status",
      description: `Rack ${i + 1} online/offline status`,
      unit: "",
      protocol: "MODBUS" as const,
      registerAddress: 40301 + i,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "UINT16" as const,
      scale: 1,
      offset: 0,
      priority: 1,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // Temperature (FLOAT32 = 2 register) - Input Register
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "Temperature",
      description: `Rack ${i + 1} temperature`,
      unit: "°C",
      protocol: "MODBUS" as const,
      registerAddress: 30001 + i * 2,
      registerTableType: "INPUT_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.1,
      offset: 0,
      priority: 1,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // SoH (FLOAT32 = 2 register) - Input Register
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "SoH",
      description: `Rack ${i + 1} state of health`,
      unit: "%",
      protocol: "MODBUS" as const,
      registerAddress: 30051 + i * 2,
      registerTableType: "INPUT_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.1,
      offset: 0,
      priority: 2,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // Power (FLOAT32 = 2 register)
    ...Array.from({ length: 16 }, (_, i) => ({
      name: "Power",
      description: `Rack ${i + 1} power`,
      unit: "kW",
      protocol: "MODBUS" as const,
      registerAddress: 40501 + i * 2,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.01,
      offset: 0,
      priority: 0,
      byteOrder: "BIG_ENDIAN" as const,
      tags: { rack_id: (i + 1).toString() },
    })),

    // ChargeStatus (UINT16 = 1 register) - TEK, tüm rack'ler için
    {
      name: "ChargeStatus",
      description: "Charge/Discharge/Idle status for all racks",
      unit: "",
      protocol: "MODBUS" as const,
      registerAddress: 40401,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "UINT16" as const,
      scale: 1,
      offset: 0,
      priority: 0,
      byteOrder: "BIG_ENDIAN" as const,
    },
    {
      name: "GlobalPower",
      description: "Global power for all racks (kW)",
      unit: "kW",
      protocol: "MODBUS" as const,
      registerAddress: 40410,
      registerTableType: "HOLDING_REGISTER" as const,
      registerDataType: "FLOAT32" as const,
      scale: 0.01,
      offset: 0,
      priority: 0,
      byteOrder: "BIG_ENDIAN" as const,
      // tags yok - global
    },
  ] as ModbusTelemetryData[],
});
