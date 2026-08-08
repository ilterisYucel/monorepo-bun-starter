import type { ChargeStatus } from "@gd-monorepo/shared-types";

export interface BSCCardLabels {
  online: string;
  offline: string;
  charging: string;
  discharging: string;
  idle: string;
  voltage: string;
  current: string;
  chargePower: string;
  dischargePower: string;
  anticipatedVoltage: string;
  maxTemperature: string;
  version: string;
  state: string;
  heartbeat: string;
  commandResponse: string;
  lastCommand: string;
  rack: string;
  systemPower: string;
  systemSoc: string;
  systemSoh: string;
  active: string;
  detail: string;
}

export interface BSCCardProps {
  name: string;
  status: "online" | "offline";
  chargeStatus: ChargeStatus;
  soc: number | null;
  soh: number | null;
  rackCount: number;
  onlineRackCount: number;
  systemPowerKw: number | null;
  voltage: number | null;
  current: number | null;
  chargePowerKw: number | null;
  dischargePowerKw: number | null;
  anticipatedVoltage: number | null;
  temperature: number | null;
  version: string;
  state: string;
  heartbeat: string;
  requestAck: string;
  lastAcceptedReq: string;
  onDetailClick?: () => void;
  labels?: BSCCardLabels;
}
