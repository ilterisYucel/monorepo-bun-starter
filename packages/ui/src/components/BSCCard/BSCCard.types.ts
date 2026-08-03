import type { ChargeStatus } from "@gd-monorepo/shared-types";

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
}
