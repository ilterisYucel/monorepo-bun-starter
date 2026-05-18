// hooks/useSystemStatus.ts
import { useMemo } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface SystemStatus {
  chargeStatus: "Charge" | "Discharge" | "Idle";
  isCharging: boolean;
  isDischarging: boolean;
  isIdle: boolean;
}

export const useSystemStatus = (telemetries: TelemetryData[]): SystemStatus => {
  const chargeStatus = useMemo(() => {
    // ChargeStatus telemetry'sini bul (global, tags yok)
    const chargeStatusTelemetry = telemetries.find(
      (t) =>
        t.name === "ChargeStatus" &&
        (!t.tags || Object.keys(t.tags).length === 0),
    );

    const value = chargeStatusTelemetry?.value;

    if (value === 1) return "Charge";
    if (value === 2) return "Discharge";
    return "Idle";
  }, [telemetries]);

  return {
    chargeStatus,
    isCharging: chargeStatus === "Charge",
    isDischarging: chargeStatus === "Discharge",
    isIdle: chargeStatus === "Idle",
  };
};
