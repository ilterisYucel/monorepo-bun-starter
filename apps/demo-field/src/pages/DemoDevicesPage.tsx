import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  COLORS_LIGHT,
  DemoAuxPanel,
  DemoBatteryPanel,
  DemoHvacPanel,
  DemoMvPanel,
  DemoPcsPanel,
  DemoRmuTrPanel,
  DEMO_DEVICE_TABS,
  listNovaUnits,
  type DemoDeviceSection,
} from "@gd-monorepo/ui";
import { useDemoFieldData } from "../features/demo-data/useDemoFieldData";
import { useDemoFieldTelemetry } from "../features/demo-data/useDemoFieldTelemetry";
import { mapFieldToMimicState } from "../features/demo-data/mapFieldToMimicState";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { siteFieldId } from "../lib/site-field";

/**
 * DemoDevicesPage (Devices) — UC-5: MV/Battery/PCS/HVAC/RMU&TR/AUX sekmeleri,
 * canlı telemetriyle beslenir. `?tab=` + `?unit=` deep-link destekler (mimic
 * tıklaması bu sayfaya yönlendirir — FR-5.3).
 */
export const DemoDevicesPage: React.FC = () => {
  const fieldId = siteFieldId();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, error } = useDemoFieldData();
  const fieldTelemetry = useDemoFieldTelemetry();

  const tab = (params.get("tab") as DemoDeviceSection) ?? "battery";
  const unitN = Number(params.get("unit") ?? "1") || 1;
  const [localUnit, setLocalUnit] = useState(unitN);

  const state = useMemo(
    () =>
      mapFieldToMimicState(data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: fieldTelemetry.data ?? [],
      }),
    [data, fieldTelemetry.data],
  );
  const unit = state.units.find((u) => u.n === localUnit);
  const units = useMemo(() => listNovaUnits(DEMO_TOPOLOGY), []);

  const selectTab = (id: DemoDeviceSection) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    next.set("unit", String(localUnit));
    setParams(next, { replace: true });
  };
  const selectUnit = (n: number) => {
    setLocalUnit(n);
    const next = new URLSearchParams(params);
    next.set("unit", String(n));
    setParams(next, { replace: true });
  };

  if (fieldId.length === 0) return <Notice tone="error" text="Saha kimliği tanımsız (VITE_FIELD_ID)." />;
  if (isLoading) return <Notice tone="muted" text="Yükleniyor…" />;
  if (isError) return <Notice tone="error" text={`Saha verisi alınamadı: ${error?.message ?? "bilinmeyen hata"}`} />;

  return (
    <div style={{ background: COLORS_LIGHT.bg, padding: 10, minHeight: "100%" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <section style={panelStyle}>
          <header style={headerStyle}>Cihazlar · BESS#{localUnit}</header>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 12px" }}>
            {units.map((u) => (
              <button
                key={u.n}
                type="button"
                onClick={() => selectUnit(u.n)}
                style={{
                  border: `1px solid ${COLORS_LIGHT.line}`,
                  borderRadius: 4,
                  padding: "4px 9px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: u.n === localUnit ? COLORS_LIGHT.panel2 : "none",
                  color: u.n === localUnit ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
                  boxShadow: u.n === localUnit ? `inset 0 -2px 0 ${COLORS_LIGHT.sel}` : "none",
                }}
              >
                {u.feeder}·{u.n}
              </button>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
            }}
          >
            {DEMO_DEVICE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`devtab-${t.id}`}
                onClick={() => selectTab(t.id)}
                style={{
                  border: 0,
                  background: "none",
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: tab === t.id ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
                  boxShadow: tab === t.id ? `inset 0 -2px 0 ${COLORS_LIGHT.sel}` : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "12px 14px 14px" }}>
            {renderPanel(tab, unit)}
          </div>
        </section>
      </div>
    </div>
  );
};

function renderPanel(
  tab: DemoDeviceSection,
  unit: ReturnType<typeof mapFieldToMimicState>["units"][number] | undefined,
): React.ReactNode {
  switch (tab) {
    case "mv":
      return <DemoMvPanel unit={unit} topology={DEMO_TOPOLOGY} />;
    case "pcs":
      return <DemoPcsPanel unit={unit} topology={DEMO_TOPOLOGY} />;
    case "hvac":
      return <DemoHvacPanel unit={unit} topology={DEMO_TOPOLOGY} />;
    case "rmutr":
      return <DemoRmuTrPanel unit={unit} topology={DEMO_TOPOLOGY} />;
    case "aux":
      return <DemoAuxPanel unit={unit} topology={DEMO_TOPOLOGY} />;
    case "battery":
    default:
      return <DemoBatteryPanel unit={unit} topology={DEMO_TOPOLOGY} />;
  }
}

const panelStyle: React.CSSProperties = {
  background: COLORS_LIGHT.panel,
  border: `1px solid ${COLORS_LIGHT.line}`,
  borderRadius: 6,
};
const headerStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
  fontWeight: 700,
  fontSize: 15,
  color: COLORS_LIGHT.fg,
};

const Notice: React.FC<{ tone: "error" | "muted"; text: string }> = ({ tone, text }) => (
  <div
    style={{
      padding: 32,
      textAlign: "center",
      background: COLORS_LIGHT.bg,
      color: tone === "error" ? COLORS_LIGHT.alarm : COLORS_LIGHT.muted,
    }}
  >
    {text}
  </div>
);
