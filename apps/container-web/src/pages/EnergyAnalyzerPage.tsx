import React, { useMemo } from "react";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useEnergyAnalyzerData } from "../features/energy-analyzer";
import * as S from "./EnergyAnalyzerPage.styles";

const FreqIcon = SCADA_ICONS.timer;
const PowerIcon = SCADA_ICONS.batteryCharge;
const EnergyIcon = SCADA_ICONS.powerPlug;

const format = (val: number, decimals = 1): string => val.toFixed(decimals);

interface MetricRowProps {
  label: string;
  value: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value }) => (
  <S.MetricRow>
    <S.MetricLabel>{label}</S.MetricLabel>
    <S.MetricValue>{value}</S.MetricValue>
  </S.MetricRow>
);

export const EnergyAnalyzerPage: React.FC = () => {
  const { t } = useTranslation();
  const { summaries, isLoading } = useEnergyAnalyzerData();
  const summary = summaries[0];

  const totalActive = useMemo(
    () => summary ? summary.phaseA.activePower + summary.phaseB.activePower + summary.phaseC.activePower : 0,
    [summary],
  );

  if (isLoading) {
    return <S.Loading>{t("common.loading")}</S.Loading>;
  }

  if (!summary) {
    return <S.Empty>{t("energyAnalyzer.nodata")}</S.Empty>;
  }

  return (
    <S.Container>
      <S.TopCards>
        <S.StatusCard $variant="ok">
          <S.CardIcon><FreqIcon size={32} /></S.CardIcon>
          <S.CardValue $variant="ok">{format(summary.frequency, 2)} Hz</S.CardValue>
          <S.CardLabel $variant="ok">{t("energyAnalyzer.frequency")}</S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant="ok">
          <S.CardIcon><PowerIcon size={32} /></S.CardIcon>
          <S.CardValue $variant="ok">{format(totalActive)} kW</S.CardValue>
          <S.CardLabel $variant="ok">{t("energyAnalyzer.activePower")}</S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant="ok">
          <S.CardIcon><EnergyIcon size={32} /></S.CardIcon>
          <S.CardValue $variant="ok">{format(summary.activeEnergyDelivered, 1)} kWh</S.CardValue>
          <S.CardLabel $variant="ok">{t("energyAnalyzer.activeEnergyDelivered")}</S.CardLabel>
        </S.StatusCard>
      </S.TopCards>

      <S.PhaseGrid>
        {(["A", "B", "C"] as const).map((phase) => {
          const p = summary[`phase${phase}` as "phaseA" | "phaseB" | "phaseC"];
          return (
            <S.PhaseCard key={phase}>
              <S.PhaseLabel>{t(`energyAnalyzer.phase${phase}`)}</S.PhaseLabel>
              <S.MetricsList>
                <MetricRow label={t("energyAnalyzer.voltageLN")} value={`${format(p.voltageLN)} V`} />
                <MetricRow label={t("energyAnalyzer.voltageLL")} value={`${format(p.voltageLL)} V`} />
                <MetricRow label={t("energyAnalyzer.current")} value={`${format(p.current)} A`} />
                <MetricRow label={t("energyAnalyzer.activePower")} value={`${format(p.activePower)} kW`} />
                <MetricRow label={t("energyAnalyzer.reactivePower")} value={`${format(p.reactivePower)} kVAR`} />
                <MetricRow label={t("energyAnalyzer.apparentPower")} value={`${format(p.apparentPower)} kVA`} />
                <MetricRow label={t("energyAnalyzer.powerFactor")} value={format(p.powerFactor, 3)} />
                <MetricRow label={t("energyAnalyzer.thdCurrent")} value={`${format(p.thdCurrent, 1)}%`} />
                <MetricRow label={t("energyAnalyzer.thdVoltage")} value={`${format(p.thdVoltage, 1)}%`} />
              </S.MetricsList>
            </S.PhaseCard>
          );
        })}
      </S.PhaseGrid>

      <S.BottomGrid>
        <MetricRow label={t("energyAnalyzer.neutral")} value={`${format(summary.neutralCurrent)} A`} />
        <MetricRow label={t("energyAnalyzer.demandPowerPresent")} value={`${format(summary.demandPowerPresent)} kW`} />
        <MetricRow label={t("energyAnalyzer.demandPowerPeak")} value={`${format(summary.demandPowerPeak)} kW`} />
        <MetricRow label={t("energyAnalyzer.demandCurrentPresent")} value={`${format(summary.demandCurrentPresent)} A`} />
        <MetricRow label={t("energyAnalyzer.reactiveEnergyDelivered")} value={`${format(summary.reactiveEnergyDelivered, 1)} kVARh`} />
        <MetricRow label={t("energyAnalyzer.reactiveEnergyReceived")} value={`${format(summary.reactiveEnergyReceived, 1)} kVARh`} />
        <MetricRow label={t("energyAnalyzer.apparentEnergy")} value={`${format(summary.apparentEnergy, 1)} kVAh`} />
        <MetricRow label={t("energyAnalyzer.activeEnergyReceived")} value={`${format(summary.activeEnergyReceived, 1)} kWh`} />
      </S.BottomGrid>
    </S.Container>
  );
};
