// apps/web/src/features/racks/hooks/useRackTelemetry.ts
import { useTelemetryProvider } from "../../../hooks/useTelemetryProvider";

export const useRackTelemetry = (rackId: number) => {
  const telemetryNames = ["Voltage", "Current", "Power", "Temperature", "SoC", "SoH"];

  return useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 120,
    // Belirli rafa filtre + serileri rack_id ile ayır (BSC tag'i).
    filters: { rack_id: rackId.toString() },
    tag: "rack_id",
  });
};