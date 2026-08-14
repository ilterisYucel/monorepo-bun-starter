import React from "react";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { MockPcs } from "../services/mockDataGenerator";

const PcsIcon = SCADA_ICONS.powerPlug;

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div
    style={{
      background: COLORS.bgInput,
      borderRadius: "8px",
      padding: "8px 6px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "13px", fontWeight: 700, color: color ?? COLORS.textWhite }}>{value}</div>
    <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "2px" }}>{label}</div>
  </div>
);

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: "10px" }}>
    <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textMuted, marginBottom: "6px" }}>{label}</div>
    {children}
  </div>
);

export const PcsCard: React.FC<{ pcs: MockPcs }> = ({ pcs }) => {
  const { t } = useTranslation();
  const val = (name: string): number =>
    (pcs.latestTelemetry.find((x) => x.name === name)?.value as number) ?? 0;

  const activePower = val("AC Active Power");
  const stateColor = !pcs.connected
    ? COLORS.error
    : activePower < 0
      ? COLORS.success
      : activePower > 0
        ? COLORS.warning
        : COLORS.idle;
  const stateLabel = !pcs.connected
    ? t("common.offline")
    : activePower < 0
      ? t("status.charging")
      : activePower > 0
        ? t("status.discharging")
        : t("status.idleMode");

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <PcsIcon size={16} color={stateColor} />
        <span style={{ fontWeight: 600, fontSize: "14px", color: COLORS.textWhite }}>
          {pcs.pcsId} — {pcs.containerName}
        </span>
        <span style={{ fontSize: "11px", color: stateColor, marginLeft: "auto" }}>{stateLabel}</span>
      </div>

      <Section label={t("pcs.acSection")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "6px" }}>
          <Stat label={t("pcs.voltageAB")} value={`${val("AC Voltage AB").toFixed(0)}V`} color={COLORS.textVoltage} />
          <Stat label={t("pcs.voltageBC")} value={`${val("AC Voltage BC").toFixed(0)}V`} color={COLORS.textVoltage} />
          <Stat label={t("pcs.voltageCA")} value={`${val("AC Voltage CA").toFixed(0)}V`} color={COLORS.textVoltage} />
          <Stat label={t("pcs.frequency")} value={`${val("AC Frequency").toFixed(1)} Hz`} />
          <Stat label={t("pcs.currentA")} value={`${val("Phase Current A").toFixed(1)}A`} />
          <Stat label={t("pcs.currentB")} value={`${val("Phase Current B").toFixed(1)}A`} />
          <Stat label={t("pcs.currentC")} value={`${val("Phase Current C").toFixed(1)}A`} />
          <Stat label={t("pcs.activePower")} value={`${val("AC Active Power").toFixed(1)} kW`} color={COLORS.info} />
          <Stat label={t("pcs.reactivePower")} value={`${val("AC Reactive Power").toFixed(1)} kvar`} />
          <Stat label={t("pcs.apparentPower")} value={`${val("AC Apparent Power").toFixed(1)} kVA`} />
          <Stat label="PF" value={val("Power Factor").toFixed(2)} />
        </div>
      </Section>

      <Section label={t("pcs.dcSection")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "6px" }}>
          <Stat label={t("pcs.dcVoltage")} value={`${val("DC Voltage").toFixed(0)}V`} color={COLORS.textPurple} />
          <Stat label={t("pcs.dcCurrent")} value={`${val("DC Current").toFixed(1)}A`} />
          <Stat label={t("pcs.dcPower")} value={`${val("DC Power").toFixed(1)} kW`} color={COLORS.info} />
          <Stat label={t("pcs.igbtTemp")} value={`${val("IGBT Temperature").toFixed(1)}°C`} color={COLORS.tempHot} />
          <Stat label={t("pcs.cabinTemp")} value={`${val("Cabin Temperature").toFixed(1)}°C`} color={COLORS.tempChilly} />
        </div>
      </Section>

      <Section label={t("pcs.availableSection")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "6px" }}>
          <Stat label={t("pcs.availableCharge")} value={`${val("Available Charge Power").toFixed(0)} kW`} color={COLORS.success} />
          <Stat label={t("pcs.availableDischarge")} value={`${val("Available Discharge Power").toFixed(0)} kW`} color={COLORS.warning} />
          <Stat label={t("pcs.availableIndReactive")} value={`${val("Available Inductive Reactive Power").toFixed(0)} kvar`} />
          <Stat label={t("pcs.availableCapReactive")} value={`${val("Available Capacitive Reactive Power").toFixed(0)} kvar`} />
        </div>
      </Section>

      <Section label={t("pcs.energySection")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "6px" }}>
          <Stat label={t("pcs.totalChargeEnergy")} value={`${val("Total Charge Energy").toFixed(0)} kWh`} color={COLORS.success} />
          <Stat label={t("pcs.totalDischargeEnergy")} value={`${val("Total Discharge Energy").toFixed(0)} kWh`} color={COLORS.warning} />
          <Stat label={t("pcs.dailyChargeEnergy")} value={`${val("Daily Charge Energy").toFixed(0)} kWh`} />
          <Stat label={t("pcs.dailyDischargeEnergy")} value={`${val("Daily Discharge Energy").toFixed(0)} kWh`} />
        </div>
      </Section>
    </div>
  );
};
