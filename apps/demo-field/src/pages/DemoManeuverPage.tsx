import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DemoActiveManeuver,
  DemoManeuverWizard,
  DemoReadyCard,
  COLORS_LIGHT,
  listNovaUnits,
  type DemoExecutePayload,
  type DemoScopeUnit,
} from "@gd-monorepo/ui";
import { demoManeuverApi } from "../features/demo-data/demoManeuverApi";
import { demoApi } from "../features/demo-data/demoApi";
import { useDemoFieldData } from "../features/demo-data/useDemoFieldData";
import { useDemoFieldTelemetry } from "../features/demo-data/useDemoFieldTelemetry";
import { mapFieldToMimicState } from "../features/demo-data/mapFieldToMimicState";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/**
 * DemoManeuverPage (Manevra) — UC-5: sunucu demo kataloğu (demo_*), kapsam
 * sihirbazı, aktif run takibi ve durdurma. Işık tema.
 */
export const DemoManeuverPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data } = useDemoFieldData();
  const fieldTelemetry = useDemoFieldTelemetry();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const catalog = useQuery({
    queryKey: ["demo-maneuver-catalog"],
    queryFn: ({ signal }) => demoManeuverApi.listDemoCatalog(signal),
    refetchOnWindowFocus: false,
  });

  const active = useQuery({
    queryKey: ["demo-active-run"],
    queryFn: ({ signal }) => demoManeuverApi.activeRun(signal),
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  const runs = useQuery({
    queryKey: ["demo-runs"],
    queryFn: ({ signal }) => demoApi.listRuns(signal),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  const state = useMemo(
    () =>
      mapFieldToMimicState(data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: fieldTelemetry.data ?? [],
      }),
    [data, fieldTelemetry.data],
  );

  const units: DemoScopeUnit[] = useMemo(
    () =>
      listNovaUnits(DEMO_TOPOLOGY).map((m) => {
        const u = state.units.find((x) => x.n === m.n);
        const soc = u ? (u.banks[0].soc + u.banks[1].soc) / 2 : 0;
        return {
          n: m.n,
          feeder: m.feeder,
          note: u ? `Fider ${m.feeder} · SOC ${soc.toFixed(0)} %` : `Fider ${m.feeder}`,
          disabled: false,
        };
      }),
    [state],
  );

  const handleExecute = async (payload: DemoExecutePayload) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await demoManeuverApi.execute(payload);
      setMessage(`${payload.name} komutu gönderildi.`);
      await queryClient.invalidateQueries({ queryKey: ["demo-active-run"] });
    } catch (e) {
      setError(`Komut reddedildi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setError("");
    try {
      await demoManeuverApi.stop();
      setMessage("Durdurma komutu gönderildi.");
      await queryClient.invalidateQueries({ queryKey: ["demo-active-run"] });
    } catch (e) {
      setError(`Durdurma başarısız: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: COLORS_LIGHT.bg, padding: 10, minHeight: "100%" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <section
          style={{
            background: COLORS_LIGHT.panel,
            border: `1px solid ${COLORS_LIGHT.line}`,
            borderRadius: 6,
          }}
        >
          <DemoReadyCard
            runs={runs.data ?? []}
            banks={state.units.flatMap((u) => u.banks)}
            limits={DEMO_TOPOLOGY.limits}
          />
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: 10, alignItems: "start" }}>
        <section>
          {catalog.isLoading ? (
            <Panel>Katalog yükleniyor…</Panel>
          ) : catalog.isError ? (
            <Panel>Katalog alınamadı: {catalog.error.message}</Panel>
          ) : (catalog.data ?? []).length === 0 ? (
            <Panel>Demo manevra kataloğu boş (demo_* kayıt yok).</Panel>
          ) : (
            <DemoManeuverWizard
              items={catalog.data ?? []}
              units={units}
              busy={busy}
              message={message}
              error={error}
              onExecute={handleExecute}
            />
          )}
        </section>
        <aside
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
            Aktif manevra
          </header>
          <DemoActiveManeuver run={active.data} onStop={handleStop} busy={busy} />
        </aside>
        </div>
      </div>
    </div>
  );
};

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: COLORS_LIGHT.panel,
      border: `1px solid ${COLORS_LIGHT.line}`,
      borderRadius: 6,
      padding: 24,
      color: COLORS_LIGHT.muted,
    }}
  >
    {children}
  </div>
);
