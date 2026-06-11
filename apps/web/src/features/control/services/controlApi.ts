// apps/web/src/features/control/services/controlApi.ts
import { apiClient } from "../../../lib/api-client";

export const controlApi = {
  setPower: async (
    chargeStatus: "Charge" | "Discharge" | "Idle",
    powerKw: number,
    durationSeconds: number
  ): Promise<void> => {
    await apiClient.post("/racks/commands/power", {
      charge_status: chargeStatus,
      power_kw: powerKw,
      duration_seconds: durationSeconds,
    });
  },
};