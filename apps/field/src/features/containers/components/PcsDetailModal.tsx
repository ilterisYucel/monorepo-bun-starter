// apps/field/src/features/containers/components/PcsDetailModal.tsx
import React from "react";
import { COLORS, useTranslation } from "@gd-monorepo/ui";
import { Modal } from "../../ui";
import {
  pcsState,
  pcsTelemetryValue,
} from "../hooks/pcsDerivation";
import type { PcsSummary } from "./PcsCard";

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      background: COLORS.bgInput,
      borderRadius: "8px",
      padding: "8px 6px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "13px", fontWeight: 700, color: color ?? COLORS.textWhite }}>
      {value}
    </div>
    <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "2px" }}>{label}</div>
  </div>
);

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: "10px" }}>
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        color: COLORS.textMuted,
        marginBottom: "6px",
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
  gap: "6px",
};

/**
 * PcsDetailModal — PCS ayrıntılı telemetrisi (2026-08-30):
 * AC/DC tarafları, kullanılabilir güçler ve enerji sayaçları; PcsCard'ın
 * kompakt kartının "Detay" aksiyonuyla açılır.
 */
export const PcsDetailModal: React.FC<{
  pcs: PcsSummary | null;
  open: boolean;
  onClose: () => void;
}> = ({ pcs, open, onClose }) => {
  const { t } = useTranslation();
  if (!pcs) return null;
  const val = (name: string): number => pcsTelemetryValue(pcs.latestTelemetry, name);
  const state = pcsState(pcs.connected, val("AC Active Power"));

  return (
    <Modal open={open} title={`${pcs.pcsId} — ${t("pcs.detailTitle")}`} onClose={onClose}>
      <div style={{ fontSize: "11px", color: COLORS.textMuted, marginBottom: "10px" }}>
        {t("pcs.containerLabel")}: {pcs.containerName} · {t(state.statusKey)}
      </div>

      <Section label={t("pcs.acSection")}>
        <div style={gridStyle}>
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
          <Stat label={t("pcs.powerFactor")} value={val("Power Factor").toFixed(2)} />
        </div>
      </Section>

      <Section label={t("pcs.dcSection")}>
        <div style={gridStyle}>
          <Stat label={t("pcs.dcVoltage")} value={`${val("DC Voltage").toFixed(0)}V`} color={COLORS.textPurple} />
          <Stat label={t("pcs.dcCurrent")} value={`${val("DC Current").toFixed(1)}A`} />
          <Stat label={t("pcs.dcPower")} value={`${val("DC Power").toFixed(1)} kW`} color={COLORS.info} />
          <Stat label={t("pcs.igbtTemp")} value={`${val("IGBT Temperature").toFixed(1)}°C`} color={COLORS.tempHot} />
          <Stat label={t("pcs.cabinTemp")} value={`${val("Cabin Temperature").toFixed(1)}°C`} color={COLORS.tempChilly} />
        </div>
      </Section>

      <Section label={t("pcs.availableSection")}>
        <div style={gridStyle}>
          <Stat label={t("pcs.availableCharge")} value={`${val("Available Charge Power").toFixed(0)} kW`} color={COLORS.success} />
          <Stat label={t("pcs.availableDischarge")} value={`${val("Available Discharge Power").toFixed(0)} kW`} color={COLORS.warning} />
          <Stat label={t("pcs.availableIndReactive")} value={`${val("Available Inductive Reactive Power").toFixed(0)} kvar`} />
          <Stat label={t("pcs.availableCapReactive")} value={`${val("Available Capacitive Reactive Power").toFixed(0)} kvar`} />
        </div>
      </Section>

      <Section label={t("pcs.energySection")}>
        <div style={gridStyle}>
          <Stat label={t("pcs.totalChargeEnergy")} value={`${val("Total Charge Energy").toFixed(0)} kWh`} color={COLORS.success} />
          <Stat label={t("pcs.totalDischargeEnergy")} value={`${val("Total Discharge Energy").toFixed(0)} kWh`} color={COLORS.warning} />
          <Stat label={t("pcs.dailyChargeEnergy")} value={`${val("Daily Charge Energy").toFixed(0)} kWh`} />
          <Stat label={t("pcs.dailyDischargeEnergy")} value={`${val("Daily Discharge Energy").toFixed(0)} kWh`} />
        </div>
      </Section>
    </Modal>
  );
};
