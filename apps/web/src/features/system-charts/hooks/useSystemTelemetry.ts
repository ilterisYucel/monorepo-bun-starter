// apps/web/src/features/system-charts/hooks/useSystemTelemetry.ts
import { useTelemetryProvider } from "../../../hooks/useTelemetryProvider";

export const useSystemTelemetry = () => {
  const telemetryNames = ["Voltage", "Current", "Power", "SoC", "Temperature", "SoH"];

  return useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
  });
};