import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../lib/api-client";

interface TelemetryConfigEntry {
  name: string;
  description: string;
  unit: string;
  tags?: Record<string, string>;
}

interface TelemetryConfigResponse {
  deviceId: string;
  telemetry: TelemetryConfigEntry[];
}

/**
 * Belirtilen cihazların telemetri konfigürasyonlarını alır,
 * benzersiz telemetri adlarını çıkarır ve opsiyonel rack filtresi uygular.
 *
 * @param deviceIds — sorgulanacak cihaz ID'leri
 * @param rackFilter — rack_id tag filtresi (örn: "system", "1", "2")
 *                      verilmezse tüm rack'lerin telemetrileri döner
 * @returns benzersiz, sıralanmış telemetry isimleri listesi
 */
export function useTelemetryNames(deviceIds: string[], rackFilter?: string) {
  const { data: configs, isLoading } = useQuery({
    queryKey: ["telemetry-configs", deviceIds],
    queryFn: async () => {
      const results = await Promise.all(
        deviceIds.map((id) =>
          apiClient
            .get<TelemetryConfigResponse>(
              `/unified/devices/${id}/telemetry-config`,
            )
            .then((r) => r.data)
            .catch(() => null),
        ),
      );
      return results.filter(Boolean) as TelemetryConfigResponse[];
    },
    enabled: deviceIds.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const names = useMemo(() => {
    if (!configs) return [];
    const nameSet = new Set<string>();

    for (const config of configs) {
      for (const entry of config.telemetry) {
        if (!entry.tags) {
          nameSet.add(entry.name);
          continue;
        }

        if (rackFilter) {
          if (entry.tags.rack_id === rackFilter) {
            nameSet.add(entry.name);
          }
        } else {
          nameSet.add(entry.name);
        }
      }
    }

    return Array.from(nameSet).sort((a, b) => a.localeCompare(b, "tr"));
  }, [configs, rackFilter]);

  return { names, isLoading };
}
