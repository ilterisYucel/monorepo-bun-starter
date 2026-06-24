// apps/web/src/features/system-charts/hooks/useSystemTelemetry.ts
import { useMemo } from "react";
import { useTelemetryProvider } from "../../../hooks/useTelemetryProvider";
import { useDevicesStore } from "../../../stores/devicesStore";

export const useSystemTelemetry = () => {
  const telemetryNames = ["SOC", "SOH", "Voltage", "Current", "ChargePower", "Temperature"];
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

  return useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
    deviceIds: bscIds,
  });
};