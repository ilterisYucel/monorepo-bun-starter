import { apiClient } from "../../../shared/axios";

export const controlService = {
  async setPower(
    chargeStatus: "Charge" | "Discharge" | "Idle",
    powerKw: number,
    durationSeconds: number,
  ): Promise<void> {
    await apiClient.post("/racks/commands/power", {
      charge_status: chargeStatus,
      power_kw: powerKw,
      duration_seconds: durationSeconds,
    });
  },
};
