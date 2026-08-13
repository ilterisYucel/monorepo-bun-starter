import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { COLORS, SCADA_ICONS, ContainerConnectionBadge, useTranslation } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { mockPcsList, mockEmu, mockTimeSeries } from "../features/containers/services/mockDataGenerator";

const PowerIcon = SCADA_ICONS.powerPlug;

interface SparklineProps {
  containerId: string;
  color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ containerId, color }) => {
  const data = useMemo(() => {
    return mockTimeSeries(containerId, 24 * 60 * 60 * 1000)
      .filter((t) => t.name === "SOC")
      .map((t) => ({ time: t.timestamp, value: t.value as number }));
  }, [containerId]);

  return (
    <div style={{ height: "46px", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${containerId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${containerId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const statBox = (value: React.ReactNode, label: string, color: string) => (
  <div
    style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.borderDefault}`,
      borderRadius: "14px",
      padding: "16px 20px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "24px", fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: "11px", color: COLORS.textMuted, marginTop: "2px" }}>{label}</div>
  </div>
);

const STATION_STATE_KEY: Record<number, string> = {
  0: "status.initialState",
  1: "status.shutdown",
  2: "status.standby",
  3: "status.hotStandby",
  4: "status.charging",
  5: "status.discharging",
};

export const FieldDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const { containers } = useContainerData(fieldId ?? "");

  const pcsList = useMemo(() => mockPcsList(), []);
  const emu = useMemo(() => mockEmu(), []);

  const emuVal = (name: string): number =>
    (emu.latestTelemetry.find((x) => x.name === name)?.value as number) ?? 0;

  const totalFlow = emuVal("Active Power"); // işaretli: + deşarj, − şarj
  const availCharge = emuVal("Available Charge Power");
  const availDischarge = emuVal("Available Discharge Power");
  const systemSoc = emuVal("System SOC");
  const systemSoh = emuVal("System SOH");
  const stationState = emuVal("Station State");

  let chargingPower = 0;
  let dischargingPower = 0;
  for (const p of pcsList) {
    const pwr = (p.latestTelemetry.find((x) => x.name === "AC Active Power")?.value as number) ?? 0;
    if (pwr < 0) chargingPower += -pwr;
    if (pwr > 0) dischargingPower += pwr;
  }

  const onlineContainers = containers.filter((c) => c.connected).length;
  const totalContainers = containers.length;
  const pcsOnline = pcsList.filter((p) => p.connected).length;
  const pcsTotal = pcsList.length;
  const flowColor = totalFlow > 0 ? COLORS.warning : totalFlow < 0 ? COLORS.success : COLORS.textMuted;

  return (
    <div>
      {/* ==================== Saha Enerji Akışı (Topoloji) ==================== */}
      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "14px",
          padding: "18px 22px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: COLORS.textMuted,
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <PowerIcon size={14} />
          {t("dashboard.topology")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 1fr) 40px minmax(140px, 1.4fr) 40px minmax(160px, 1.6fr)",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Saha Şebekesi */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                padding: "12px 8px",
                background: COLORS.bgInput,
                borderRadius: "10px",
                border: `1px solid ${COLORS.infoAlpha25}`,
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.info }}>
                {t("dashboard.fieldGrid")}
              </div>
              <div style={{ fontSize: "11px", color: flowColor, marginTop: "4px" }}>
                {t("dashboard.flow")}: {totalFlow > 0 ? "↑" : totalFlow < 0 ? "↓" : ""}{Math.abs(totalFlow).toFixed(1)} kW
              </div>
              <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "2px" }}>
                {t("dashboard.availablePower")}:
              </div>
              <div style={{ fontSize: "10px", color: COLORS.success }}>
                ↑ {availCharge.toFixed(0)} kW
              </div>
              <div style={{ fontSize: "10px", color: COLORS.warning }}>
                ↓ {availDischarge.toFixed(0)} kW
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", color: COLORS.textMuted, fontSize: "18px" }}>⟷</div>

          {/* PCS kolonu */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {pcsList.map((p) => {
              const pwr = (p.latestTelemetry.find((x) => x.name === "AC Active Power")?.value as number) ?? 0;
              return (
                <div
                  key={p.pcsId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "6px 10px",
                    background: COLORS.bgInput,
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.borderDefault}`,
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: p.connected ? COLORS.success : COLORS.error,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.textWhite }}>
                    {p.pcsId}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: pwr < 0 ? COLORS.success : pwr > 0 ? COLORS.warning : COLORS.textMuted,
                    }}
                  >
                    {pwr < 0 ? "↓" : pwr > 0 ? "↑" : ""}{Math.abs(pwr).toFixed(1)} kW
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", color: COLORS.textMuted, fontSize: "18px" }}>⟷</div>

          {/* Konteyner kolonu */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {containers.map((c) => (
              <div
                key={c.containerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "6px 10px",
                  background: COLORS.bgInput,
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.borderDefault}`,
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/field/${fieldId}/containers/${c.containerId}`)}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background:
                      c.status === "online" ? COLORS.success : c.status === "warning" ? COLORS.warning : COLORS.error,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.textWhite, flex: 1 }}>
                  {c.name}
                </span>
                <span style={{ fontSize: "11px", color: COLORS.textMuted }}>
                  %{Math.round(c.soc ?? 0)}
                </span>
                <span style={{ fontSize: "11px", color: c.connected ? COLORS.success : COLORS.error }}>
                  PPC {c.connected ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== Özet Statlar ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {statBox(
          t(STATION_STATE_KEY[stationState] ?? "common.offline"),
          t("emu.stationState"),
          stationState === 4 ? COLORS.success : stationState === 5 ? COLORS.warning : COLORS.textMuted,
        )}
        {statBox(`%${systemSoc.toFixed(1)}`, t("dashboard.avgSoc"), COLORS.success)}
        {statBox(`%${systemSoh.toFixed(1)}`, "SOH", COLORS.info)}
        {statBox(
          <>
            {chargingPower.toFixed(1)} <span style={{ fontSize: "12px", color: COLORS.textMuted }}>kW</span>
          </>,
          t("dashboard.chargePower"),
          COLORS.success,
        )}
        {statBox(
          <>
            {dischargingPower.toFixed(1)} <span style={{ fontSize: "12px", color: COLORS.textMuted }}>kW</span>
          </>,
          t("dashboard.dischargePower"),
          COLORS.warning,
        )}
        {statBox(`${pcsOnline}/${pcsTotal}`, "PCS", pcsOnline === pcsTotal ? COLORS.textWhite : COLORS.warning)}
        {statBox(
          `${onlineContainers}/${totalContainers}`,
          `PPC ${t("container.titlePlural")}`,
          onlineContainers === totalContainers ? COLORS.success : COLORS.error,
        )}
      </div>

      {/* ==================== Konteyner Kartları (sparkline) ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "12px",
        }}
      >
        {containers.map((c) => {
          const sparkColor =
            c.status === "online" ? COLORS.success : c.status === "warning" ? COLORS.warning : COLORS.error;
          return (
            <div
              key={c.containerId}
              onClick={() => navigate(`/field/${fieldId}/containers/${c.containerId}`)}
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: "12px",
                padding: "14px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: sparkColor,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.textWhite, flex: 1 }}>
                  {c.name}
                </span>
                <ContainerConnectionBadge connected={c.connected} label={t("container.connected")} size="small" />
              </div>

              <Sparkline containerId={c.containerId} color={sparkColor} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "8px" }}>
                <div style={{ fontSize: "11px", color: COLORS.textMuted }}>SoC</div>
                <div style={{ fontSize: "11px", color: COLORS.textPrimary, textAlign: "right" }}>
                  %{c.soc !== undefined ? Math.round(c.soc) : "—"}
                </div>
                <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
                  {t("device.power")}
                </div>
                <div style={{ fontSize: "11px", color: COLORS.textPrimary, textAlign: "right" }}>
                  {c.powerKw !== undefined ? `${c.powerKw.toFixed(1)} kW` : "—"}
                </div>
                <div style={{ fontSize: "11px", color: COLORS.textMuted }}>PCS</div>
                <div
                  style={{
                    fontSize: "11px",
                    color: c.connected ? COLORS.success : COLORS.error,
                    textAlign: "right",
                  }}
                >
                  {c.connected ? "✓" : "✗"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
