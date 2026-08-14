// apps/web/src/features/system-charts/hooks/useSystemTelemetry.ts
import { useMemo } from "react";
import { useTelemetryProvider } from "../../../hooks/useTelemetryProvider";
import { useTelemetryNames } from "../../../hooks/useTelemetryNames";
import { useDevicesStore } from "../../../stores/devicesStore";

// Config'den isimler gelmezse kullanilacak LG kaynakli varsayilanlar
const SYSTEM_CHART_DEFAULTS = [
  "BSC SOC",
  "BSC SOH",
  "BSC DC Voltage",
  "BSC DC Current",
  "Charge Power Limit",
  "Discharge Power Limit",
];

export const useSystemTelemetry = () => {
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

  const { names: rawTelemetryNames } = useTelemetryNames(bscIds, "system");
  const telemetryNames = useMemo(
    () => rawTelemetryNames.length > 0 ? rawTelemetryNames : SYSTEM_CHART_DEFAULTS,
    [rawTelemetryNames],
  );

  return useTelemetryProvider({
    telemetryNames,
    defaultRange: "1h",
    defaultPoints: 200,
    deviceIds: bscIds,
    filters: { rack_id: "system" },
  });
};