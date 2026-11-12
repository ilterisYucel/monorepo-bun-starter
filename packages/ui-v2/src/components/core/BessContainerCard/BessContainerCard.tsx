import { formatNumber } from "../../../utils";
import {
  BarFill,
  BarTrack,
  BankLetter,
  BankRow,
  BatteryGlyph,
  CardShell,
  Group,
  Header,
  OpenLink,
  PcsLabel,
  Reading,
  Spacer,
  StateLabel,
  Unit,
  UnitId,
  V2Banks,
  V2Dot,
  V2Foot,
  V2Header,
  V2Shell,
  V2SoC,
  V2Tile,
  V2TileHead,
  V2Value,
  V3Body,
  V3Cell,
  V3Footer,
  V3Letter,
  V3Mini,
  V3MiniRow,
} from "./BessContainerCard.styles";
import type { BessBank, BessContainerCardProps } from "./BessContainerCard.types";

const BankBar = ({ soc }: { soc: number }) => (
  <BarTrack>
    <BarFill $pct={soc} />
  </BarTrack>
);

const V1 = ({ unit, className }: BessContainerCardProps) => (
  <CardShell className={className} $status={unit.status} $width={317} $pad="4px 6px 6px">
    <Header>
      <UnitId>{unit.id}</UnitId>
      <StateLabel $status={unit.status}>{unit.stateLabel}</StateLabel>
    </Header>
    {unit.banks.map((bank: BessBank) => (
      <BankRow key={bank.label}>
        <BankLetter>{bank.label}</BankLetter>
        <Group>
          <Reading>{formatNumber(bank.voltage, 0)}</Reading>
          <Unit>V</Unit>
        </Group>
        <Group>
          <BatteryGlyph $charging={bank.voltage > 0} aria-hidden="true" />
          <Reading>{formatNumber(bank.soc, 1)}</Reading>
          <Unit>%</Unit>
        </Group>
        <Group>
          <BankBar soc={bank.soc} />
        </Group>
      </BankRow>
    ))}
  </CardShell>
);

const V2 = ({ unit, className }: BessContainerCardProps) => (
  <V2Shell className={className} $status={unit.status} $width={310} $pad="8px 10px">
    <V2Header>
      <UnitId>{unit.id}</UnitId>
      <V2Dot aria-hidden="true" />
      <StateLabel $status={unit.status}>{unit.stateLabel}</StateLabel>
      <Spacer />
      <PcsLabel>{unit.pcs}</PcsLabel>
    </V2Header>
    <V2Banks>
      {unit.banks.map((bank) => (
        <V2Tile key={bank.label}>
          <V2TileHead>
            <span>BSC {bank.label}</span>
            <span>SoH {formatNumber(bank.soh, 1)} %</span>
          </V2TileHead>
          <V2SoC>
            <V2Value>{formatNumber(bank.soc, 1)}</V2Value>
            <Unit>%</Unit>
            <span style={{ fontSize: 9 }}>SoC</span>
          </V2SoC>
          <BankBar soc={bank.soc} />
          <V2Foot>
            <span>{formatNumber(bank.voltage, 0)} V</span>
            <span style={{ color: "inherit" }}>{formatNumber(bank.temperature, 1)} °C</span>
          </V2Foot>
        </V2Tile>
      ))}
    </V2Banks>
  </V2Shell>
);

const V3 = ({ unit, onOpen, className }: BessContainerCardProps) => (
  <V2Shell className={className} $status={unit.status} $width={310} $pad="8px 10px">
    <V2Header>
      <UnitId>{unit.id}</UnitId>
      <V2Dot aria-hidden="true" />
      <StateLabel $status={unit.status}>{unit.stateLabel}</StateLabel>
      <Spacer />
      <OpenLink type="button" onClick={onOpen}>
        Open EMS ›
      </OpenLink>
    </V2Header>
    <V3Body>
      <V3Mini>
        {unit.banks.map((bank) => {
          const on = Math.round((bank.soc / 100) * 8);
          return (
            <V3MiniRow key={bank.label}>
              <V3Letter>{bank.label}</V3Letter>
              {Array.from({ length: 8 }, (_, index) => (
                <V3Cell key={index} $on={index < on} />
              ))}
            </V3MiniRow>
          );
        })}
      </V3Mini>
    </V3Body>
    <V3Footer>
      {unit.banks.map((bank) => `${bank.label} ${formatNumber(bank.soc, 1)} %`).join(" · ")}
    </V3Footer>
  </V2Shell>
);

/** BESS container kartı — V1 satır, V2 ikiz bank, V3 mini plan. */
export const BessContainerCard = ({ variant = "v2", ...props }: BessContainerCardProps) => {
  if (variant === "v1") return <V1 {...props} />;
  if (variant === "v3") return <V3 {...props} />;
  return <V2 {...props} />;
};

BessContainerCard.displayName = "BessContainerCard";
