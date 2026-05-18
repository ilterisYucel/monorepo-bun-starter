// src/modules/telemetry/hooks/useSystemStatus.ts
import { useMemo } from "react";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { SystemStatus } from "../types";

export const useSystemStatus = (telemetries: TelemetryData[]): SystemStatus => {
  return useMemo(() => {
    const chargeStatusTelemetry = telemetries.find(
      (t) =>
        t.name === "ChargeStatus" &&
        (!t.tags || Object.keys(t.tags).length === 0),
    );

    const value = chargeStatusTelemetry?.value;

    if (value === 1) {
      return {
        chargeStatus: "Charge",
        isCharging: true,
        isDischarging: false,
        isIdle: false,
      };
    }

    if (value === 2) {
      return {
        chargeStatus: "Discharge",
        isCharging: false,
        isDischarging: true,
        isIdle: false,
      };
    }

    return {
      chargeStatus: "Idle",
      isCharging: false,
      isDischarging: false,
      isIdle: true,
    };
  }, [telemetries]);
};
