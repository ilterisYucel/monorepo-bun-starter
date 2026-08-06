import { useMemo } from "react";
import { mockContainers } from "../services/mockDataGenerator";

export function useContainerData(_fieldId: string) {
  const containers = useMemo(() => mockContainers(), []);

  const containerList = useMemo(
    () =>
      containers.map((c) => {
        const bscDevices = [...new Set(
          c.latestTelemetry
            .filter((t) => t.deviceId.startsWith("BSC"))
            .map((t) => t.deviceId),
        )];

        let totalPower = 0;
        let totalSoc = 0;
        let socCount = 0;
        let maxTemp = 0;

        for (const bscId of bscDevices) {
          const powerItem = c.latestTelemetry.find(
            (t) => t.name === "Power" && t.deviceId === bscId && t.tags?.rack_id === "system",
          );
          const socItem = c.latestTelemetry.find(
            (t) => t.name === "SOC" && t.deviceId === bscId && t.tags?.rack_id === "system",
          );
          const tempItem = c.latestTelemetry.find(
            (t) => t.name === "MaxCellTemperature" && t.deviceId === bscId,
          );

          if (powerItem) totalPower += (powerItem.value as number) || 0;
          if (socItem) {
            totalSoc += (socItem.value as number) || 0;
            socCount++;
          }
          if (tempItem) maxTemp = Math.max(maxTemp, (tempItem.value as number) || 0);
        }

        const avgSoc = socCount > 0 ? totalSoc / socCount : 0;

        const uniqueDevices = new Set(c.latestTelemetry.map((t) => t.deviceId));
        const deviceCount = uniqueDevices.size;

        let activeDevices = 0;
        for (const deviceId of uniqueDevices) {
          const deviceEntries = c.latestTelemetry.filter((t) => t.deviceId === deviceId);
          if (deviceId.startsWith("BSC")) {
            const power = deviceEntries.find((t) => t.name === "Power" && t.tags?.rack_id === "system");
            if (power && (power.value as number) > 0) activeDevices++;
          } else if (deviceId.startsWith("CB")) {
            const closed = deviceEntries.find((t) => t.name === "Is Closed");
            if (closed && closed.value === true) activeDevices++;
          } else if (deviceId.startsWith("DC")) {
            const on = deviceEntries.find((t) => t.name === "Is On");
            if (on && on.value === true) activeDevices++;
          } else if (deviceId.startsWith("HVAC")) {
            const temp = deviceEntries.find((t) => t.name === "Room Temperature");
            if (temp && (temp.value as number) > 0) activeDevices++;
          }
        }

        return {
          containerId: c.containerId,
          name: c.name,
          status: c.status,
          connected: c.connected,
          soc: avgSoc,
          powerKw: totalPower,
          temperature: maxTemp,
          deviceCount,
          activeDeviceCount: activeDevices,
          latestTelemetry: c.latestTelemetry,
        };
      }),
    [containers],
  );

  return { containers: containerList, isLoading: false };
}
