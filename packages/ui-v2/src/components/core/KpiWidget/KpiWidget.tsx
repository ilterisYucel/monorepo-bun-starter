import { useEmsTheme } from "../../../theme";
import {
  DetailLabel,
  DetailRow,
  DetailValue,
  Fill,
  KpiCard,
  Label,
  LabelDot,
  LabelRow,
  MinMax,
  RadialWrap,
  Track,
  UnitText,
  Value,
  ValueRow,
} from "./KpiWidget.styles";
import type { KpiWidgetProps } from "./KpiWidget.types";

const Radial = ({ percent, tone }: { percent: number; tone: KpiWidgetProps["tone"] }) => {
  const { colors } = useEmsTheme();
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <RadialWrap $tone={tone ?? "success"}>
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" stroke={colors.border} strokeWidth="6" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform="rotate(-90 20 20)"
        />
      </svg>
    </RadialWrap>
  );
};

/** KPI widget — A radial, B linear scale. */
export const KpiWidget = ({
  variant = "a",
  label,
  value,
  unit,
  percent = 0,
  min,
  max,
  detailLabel,
  detailValue,
  tone = "neutral",
  className,
}: KpiWidgetProps) => (
  <KpiCard className={className}>
    <LabelRow>
      <LabelDot $tone={tone} aria-hidden="true" />
      <Label>{label}</Label>
    </LabelRow>
    <ValueRow>
      {variant === "a" ? <Radial percent={percent} tone={tone} /> : null}
      <Value>{value}</Value>
      {unit ? <UnitText>{unit}</UnitText> : null}
    </ValueRow>
    {variant === "b" ? (
      <Track>
        <Fill $pct={percent} />
      </Track>
    ) : null}
    {min || max ? (
      <MinMax>
        {min ? <span>{min}</span> : null}
        <span style={{ flex: 1 }} />
        {max ? <span>{max}</span> : null}
      </MinMax>
    ) : null}
    {detailLabel ? (
      <DetailRow>
        <DetailLabel>{detailLabel}</DetailLabel>
        <DetailValue>{detailValue}</DetailValue>
      </DetailRow>
    ) : null}
  </KpiCard>
);

KpiWidget.displayName = "KpiWidget";
