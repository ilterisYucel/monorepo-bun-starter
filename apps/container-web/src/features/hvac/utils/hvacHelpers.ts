// apps/web/src/features/hvac/utils/hvacHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { HvacUnit, HvacAlarms } from "../types/hvac";

const defaultAlarms = (): HvacAlarms => ({
  highTemp: false,
  lowTemp: false,
  overVoltage: false,
  underVoltage: false,
  compressorFault: false,
  fanFault: false,
  heaterFault: false,
  sensorFault: false,
  highPressure: false,
  lowPressure: false,
  condenserFault: false,
  evaporatorFault: false,
});

function defaultUnit(id: number, deviceId: string, room: string): HvacUnit {
  return {
    id,
    deviceId,
    room,
    name: `HVAC Unit ${id}`,
    status: "standby",
    currentTemp: null,
    supplyTemp: null,
    returnHumidity: null,
    outsideTemp: null,
    condenserTemp: null,
    evaporatorTemp: null,
    internalFanSpeed: null,
    externalFanSpeed: null,
    acVoltage: null,
    compressorRuntime: null,
    equipmentRuntime: null,
    fanRuntime: null,
    alarms: defaultAlarms(),
    coolingSetpoint: null,
    heatingSetpoint: null,
  };
}

function extractUnitId(deviceId: string): number | undefined {
  const m = deviceId.match(/HVAC-(\d+)/i);
  if (!m?.[1]) return undefined;
  return parseInt(m[1], 10);
}

function statusMap(v: number): HvacUnit["status"] {
  if (v === 2) return "running";
  if (v === 3) return "fault";
  return "standby";
}

export function telemetriesToHvacUnits(
  telemetries: TelemetryData[],
): HvacUnit[] {
  const unitMap = new Map<number, HvacUnit>();

  for (const t of telemetries) {
    const unitId = t.tags?.unit
      ? parseInt(t.tags.unit, 10)
      : extractUnitId(t.deviceId);
    if (!unitId || isNaN(unitId)) continue;

    if (!unitMap.has(unitId)) {
      const room = (t.tags?.room as string) ?? "unknown";
      unitMap.set(unitId, defaultUnit(unitId, t.deviceId, room));
    }
    const unit = unitMap.get(unitId)!;

    switch (t.name) {
      case "Equipment Status":
        unit.status = statusMap(t.value as number);
        break;
      case "Current Temp":
        unit.currentTemp = t.value as number;
        break;
      case "Supply Temp":
        unit.supplyTemp = t.value as number;
        break;
      case "Return Humidity":
        unit.returnHumidity = t.value as number;
        break;
      case "Outside Temp":
        unit.outsideTemp = t.value as number;
        break;
      case "Condenser Temp":
        unit.condenserTemp = t.value as number;
        break;
      case "Evaporator Temp":
        unit.evaporatorTemp = t.value as number;
        break;
      case "Internal Fan Speed":
        unit.internalFanSpeed = t.value as number;
        break;
      case "External Fan Speed":
        unit.externalFanSpeed = t.value as number;
        break;
      case "AC Input Voltage":
        unit.acVoltage = t.value as number;
        break;
      case "Compressor Runtime":
        unit.compressorRuntime = t.value as number;
        break;
      case "Equipment Runtime":
        unit.equipmentRuntime = t.value as number;
        break;
      case "Internal Fan Runtime":
        unit.fanRuntime = t.value as number;
        break;
      case "Cooling Setpoint":
        unit.coolingSetpoint = t.value as number;
        break;
      case "Heating Setpoint":
        unit.heatingSetpoint = t.value as number;
        break;
      case "High Temp Alarm":
        unit.alarms.highTemp = t.value === 1;
        break;
      case "Low Temp Alarm":
        unit.alarms.lowTemp = t.value === 1;
        break;
      case "Over Voltage Alarm":
        unit.alarms.overVoltage = t.value === 1;
        break;
      case "Under Voltage Alarm":
        unit.alarms.underVoltage = t.value === 1;
        break;
      case "Compressor Fault":
        unit.alarms.compressorFault = t.value === 1;
        break;
      case "Fan Fault":
        unit.alarms.fanFault = t.value === 1;
        break;
      case "Heater Fault":
        unit.alarms.heaterFault = t.value === 1;
        break;
      case "Sensor Fault":
        unit.alarms.sensorFault = t.value === 1;
        break;
      case "High Pressure Alarm":
        unit.alarms.highPressure = t.value === 1;
        break;
      case "Low Pressure Alarm":
        unit.alarms.lowPressure = t.value === 1;
        break;
      case "Condenser Fault":
        unit.alarms.condenserFault = t.value === 1;
        break;
      case "Evaporator Fault":
        unit.alarms.evaporatorFault = t.value === 1;
        break;
    }
  }

  return Array.from(unitMap.values()).sort((a, b) => a.id - b.id);
}
