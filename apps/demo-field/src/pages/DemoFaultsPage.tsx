import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COLORS_LIGHT,
  DemoFaultList,
  DemoFaultResolve,
  type DemoFaultFilter,
} from "@gd-monorepo/ui";
import type { DeviceAlarmState } from "@gd-monorepo/shared-types";
import { demoAlarmApi } from "../features/demo-data/demoAlarmApi";

/**
 * DemoFaultsPage (Faults) — UC-6: aktif/çözülmüş alarm listesi + notlu resolve.
 * FL-06 recovery arka planda `r06_recovery` kuralıyla çalışır (K6).
 */
export const DemoFaultsPage: React.FC = () => {
  const [filter, setFilter] = useState<DemoFaultFilter>("active");
  const [target, setTarget] = useState<DeviceAlarmState | null>(null);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const alarms = useQuery({
    queryKey: ["demo-alarms"],
    queryFn: ({ signal }) => demoAlarmApi.list(signal),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  const resolve = useMutation({
    mutationFn: (args: { deviceId: string; alarmName: string; note: string }) =>
      demoAlarmApi.resolve(args.deviceId, args.alarmName, args.note),
    onSuccess: async () => {
      setTarget(null);
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["demo-alarms"] });
    },
    onError: (e: Error) => setMessage(`Çözülemedi: ${e.message}`),
  });

  const counts = useMemo(() => {
    const list = alarms.data ?? [];
    return {
      active: list.filter((a) => a.active && !a.resolved).length,
      total: list.length,
    };
  }, [alarms.data]);

  return (
    <div style={{ background: COLORS_LIGHT.bg, padding: 10, minHeight: "100%" }}>
      <section
        style={{
          background: COLORS_LIGHT.panel,
          border: `1px solid ${COLORS_LIGHT.line}`,
          borderRadius: 6,
        }}
      >
        <header
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
            fontWeight: 700,
            fontSize: 15,
            color: COLORS_LIGHT.fg,
          }}
        >
          Faults
          <small style={{ marginLeft: 8, fontWeight: 500, color: COLORS_LIGHT.muted }}>
            {counts.active} aktif · {counts.total} kayıt
          </small>
        </header>

        {alarms.isLoading ? (
          <p style={{ padding: 24, color: COLORS_LIGHT.muted }}>Yükleniyor…</p>
        ) : alarms.isError ? (
          <p style={{ padding: 24, color: COLORS_LIGHT.alarm }}>
            Alarmlar alınamadı: {alarms.error.message}
          </p>
        ) : (
          <DemoFaultList
            alarms={alarms.data ?? []}
            filter={filter}
            onFilterChange={setFilter}
            onResolve={(a) => {
              setTarget(a);
              setMessage("");
            }}
          />
        )}
      </section>

      {target ? (
        <DemoFaultResolve
          alarm={target}
          busy={resolve.isPending}
          message={message}
          onConfirm={(deviceId, alarmName, note) =>
            resolve.mutate({ deviceId, alarmName, note })
          }
          onClose={() => setTarget(null)}
        />
      ) : null}
    </div>
  );
};
