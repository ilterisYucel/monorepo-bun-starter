// apps/web/src/features/racks/hooks/useRackTelemetry.ts
import { useTelemetryProvider } from "../../../hooks/useTelemetryProvider";

export const useRackTelemetry = (rackId: number) => {
  const telemetryNames = ["Voltage", "Current", "Power", "Temperature", "SoC", "SoH"];

  return useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 120,
    // 🔥 filters ile rack_id gönder
    filters: { rack_id: rackId.toString() },
  });
};