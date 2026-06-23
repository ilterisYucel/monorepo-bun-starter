// apps/web/src/features/hvac/types/hvac.ts

export interface HvacAlarms {
  highTemp: boolean;
  lowTemp: boolean;
  overVoltage: boolean;
  underVoltage: boolean;
  compressorFault: boolean;
  fanFault: boolean;
  heaterFault: boolean;
  sensorFault: boolean;
  highPressure: boolean;
  lowPressure: boolean;
  condenserFault: boolean;
  evaporatorFault: boolean;
}

export interface HvacUnit {
  id: number;
  deviceId: string;
  name: string;
  status: "standby" | "running" | "fault";
  currentTemp: number | null;
  supplyTemp: number | null;
  returnHumidity: number | null;
  outsideTemp: number | null;
  condenserTemp: number | null;
  evaporatorTemp: number | null;
  internalFanSpeed: number | null;
  externalFanSpeed: number | null;
  acVoltage: number | null;
  compressorRuntime: number | null;
  equipmentRuntime: number | null;
  fanRuntime: number | null;
  alarms: HvacAlarms;
  coolingSetpoint: number | null;
  heatingSetpoint: number | null;
}

export interface HvacAverages {
  avgCurrentTemp: number;
  avgReturnHumidity: number;
  runningUnits: number;
  totalUnits: number;
}
