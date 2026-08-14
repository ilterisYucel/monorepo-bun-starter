import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { EnergyAnalyzerCardProps, EnergyAnalyzerCardLabels } from "./EnergyAnalyzerCard.types";
import * as S from "./EnergyAnalyzerCard.styles";

const fmt = (val: number, d = 1): string => val.toFixed(d);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <S.MetricItem><S.MetricLabel>{label}</S.MetricLabel><S.MetricValue>{value}</S.MetricValue></S.MetricItem>
);

const DEFAULT_TR: EnergyAnalyzerCardLabels = {
  online: "Çevrimiçi",
  frequency: "Frekans",
  activePower: "Aktif Güç",
  energy: "Enerji",
  phaseA: "Faz A", phaseB: "Faz B", phaseC: "Faz C",
  voltageLN: "V L-N", voltageLL: "V L-L", current: "Akım",
  reactivePower: "Reaktif G.", apparentPower: "Görünür G.",
  powerFactor: "PF", thdCurrent: "THD I", thdVoltage: "THD V",
  neutral: "Nötr", demandPowerPresent: "Talep", demandPowerPeak: "Pik Talep",
  demandCurrentPresent: "Talep Akım",
  reactiveEnergyDelivered: "Reaktif E.", reactiveEnergyReceived: "Reaktif E. (G)",
  apparentEnergy: "Görünür E.", activeEnergyReceived: "Aktif E. (G)",
  detail: "Detay Göster",
};

export const EnergyAnalyzerCard: React.FC<EnergyAnalyzerCardProps> = ({
  summary, totalActivePower, onDetailClick, labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;

  return (
    <S.Card>
      <S.Header>
        <S.Name>{summary.deviceId}</S.Name>
        <S.Badges>
          <S.BadgeOnline>
            <SCADA_ICONS.statusOnline size={14} color={COLORS.success} /> {L.online}
          </S.BadgeOnline>
        </S.Badges>
      </S.Header>

      <S.PhaseRow>
        {(["A", "B", "C"] as const).map((ph) => {
          const p = summary[`phase${ph}` as "phaseA" | "phaseB" | "phaseC"];
          return (
            <S.PhaseBlock key={ph}>
              <S.PhaseTitle>{L[`phase${ph}` as "phaseA" | "phaseB" | "phaseC"]}</S.PhaseTitle>
              <Metric label={L.voltageLN} value={`${fmt(p.voltageLN)} V`} />
              <Metric label={L.voltageLL} value={`${fmt(p.voltageLL)} V`} />
              <Metric label={L.current} value={`${fmt(p.current)} A`} />
              <Metric label={L.activePower} value={`${fmt(p.activePower)} kW`} />
              <Metric label={L.reactivePower} value={`${fmt(p.reactivePower)} kVAR`} />
              <Metric label={L.apparentPower} value={`${fmt(p.apparentPower)} kVA`} />
              <Metric label={L.powerFactor} value={fmt(p.powerFactor, 3)} />
              <Metric label={L.thdCurrent} value={`${fmt(p.thdCurrent, 1)}%`} />
              <Metric label={L.thdVoltage} value={`${fmt(p.thdVoltage, 1)}%`} />
            </S.PhaseBlock>
          );
        })}
      </S.PhaseRow>

      <S.BottomGrid>
        <Metric label={L.neutral} value={`${fmt(summary.neutralCurrent)} A`} />
        <Metric label={L.demandPowerPresent} value={`${fmt(summary.demandPowerPresent)} kW`} />
        <Metric label={L.demandPowerPeak} value={`${fmt(summary.demandPowerPeak)} kW`} />
        <Metric label={L.demandCurrentPresent} value={`${fmt(summary.demandCurrentPresent)} A`} />
        <Metric label={L.reactiveEnergyDelivered} value={`${fmt(summary.reactiveEnergyDelivered, 1)} kVARh`} />
        <Metric label={L.reactiveEnergyReceived} value={`${fmt(summary.reactiveEnergyReceived, 1)} kVARh`} />
        <Metric label={L.apparentEnergy} value={`${fmt(summary.apparentEnergy, 1)} kVAh`} />
        <Metric label={L.activeEnergyReceived} value={`${fmt(summary.activeEnergyReceived, 1)} kWh`} />
      </S.BottomGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

EnergyAnalyzerCard.displayName = "EnergyAnalyzerCard";
