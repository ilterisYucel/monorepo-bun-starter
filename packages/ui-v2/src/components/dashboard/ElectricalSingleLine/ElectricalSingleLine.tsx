import { EMS_ICONS } from "../../../icons";
import { useEmsTheme } from "../../../theme";
import { formatNumber } from "../../../utils";
import {
  AcCircle,
  AcCircles,
  AcStub,
  AcStubActive,
  AcStubBase,
  BscLabel,
  BscName,
  BscRow,
  BscSub,
  BusActive,
  BusBar,
  BusBase,
  BusLabel,
  Card,
  CbmBox,
  CbmState,
  CbmTitle,
  CbmValue,
  CbSquare,
  CtBox,
  AcSmallLabel,
  BoxConnector,
  DcCb,
  Diagram,
  DropColumn,
  DropLine,
  Drops,
  GreenCb,
  Head,
  ImdChip,
  InfoIcon,
  Junction,
  JunctionDot,
  NodeDot,
  PcsCircle,
  PcsGroup,
  PcsName,
  PcsPower,
  PcsState,
  Rack,
  RackBar,
  RackBars,
  RackId,
  RackSoc,
  RackStat,
  RackStrip,
  RackText,
  Rmu,
  RmuLines,
  RmuState,
  RmuTitle,
  RightSegment,
  Rows,
  Side,
  Title,
  Trafo,
  TrafoLine,
  TrafoTitle,
  TrunkActive,
  TrunkBase,
  TrunkStack,
  WireState,
} from "./ElectricalSingleLine.styles";
import type { ElectricalSingleLineProps, RackReading } from "./ElectricalSingleLine.types";

const RackBox = ({ rack, onSelect }: { rack: RackReading; onSelect?: (rackId: string) => void }) => {
  const tone = rack.tone ?? "normal";
  const selected = rack.selected ?? false;
  const baseBar = selected ? "selected" : "base";

  return (
    <Rack
      $tone={tone}
      $selected={selected}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(rack.id) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(rack.id);
            }
          : undefined
      }
    >
      <RackBars aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <RackBar
            key={index}
            $tone={
              index === rack.alarmBarIndex
                ? "alarm"
                : index === rack.minCellBarIndex
                  ? "minCell"
                  : baseBar
            }
          />
        ))}
      </RackBars>
      <RackText>
        <RackId $tone={tone}>{rack.id}</RackId>
        <RackSoc $tone={tone}>{formatNumber(rack.soc, 1)} %</RackSoc>
        <RackStat $tone={tone} $warn={tone === "warning"}>
          {formatNumber(rack.temperature, 1)} °C
        </RackStat>
        <RackStat $tone={tone}>{formatNumber(rack.voltage, 0)} V</RackStat>
        <RackStat $tone={tone}>{formatNumber(rack.current, 0)} A</RackStat>
      </RackText>
    </Rack>
  );
};

const PcsSymbol = () => {
  const { colors } = useEmsTheme();
  return (
    <PcsCircle data-testid="pcs-circle">
      <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <path d="M10 44L44 10" stroke={colors.lineDiagram} strokeWidth="1.5" />
        <path d="M13 18H22M13 22H22" stroke={colors.lineDiagram} strokeWidth="1.5" />
        <path d="M31 36C33.5 33 36 33 38.5 36" stroke={colors.lineDiagram} strokeWidth="1.5" />
      </svg>
    </PcsCircle>
  );
};

/** Elektrik tek-hat şeması — V1 (bus üstte): rack drop + DC CB + bar + CBM + PCS + RMU. */
export const ElectricalSingleLine = ({
  title = "Electrical single-line",
  bscs,
  cbms,
  pcs,
  rmu,
  trafo,
  energized = true,
  onRackSelect,
  className,
}: ElectricalSingleLineProps) => (
  <Card className={className}>
    <Head>
      <Title>{title}</Title>
      <InfoIcon aria-hidden="true">
        <EMS_ICONS.info size={16} />
      </InfoIcon>
    </Head>
    <Diagram>
      <Rows>
        {bscs.map((bsc, rowIndex) => {
          const cbm = cbms[rowIndex];
          const pcsBlock = pcs[rowIndex];
          return (
            <BscRow key={bsc.id}>
              <BscLabel>
                <BscName>{bsc.id}</BscName>
                <BscSub>{bsc.racks.length} racks</BscSub>
              </BscLabel>
              <RackStrip>
                {bsc.racks.map((rack) => (
                  <RackBox key={rack.id} rack={rack} onSelect={onRackSelect} />
                ))}
              </RackStrip>
              <Drops aria-hidden="true">
                {bsc.racks.map((rack) => {
                  const offline = (rack.tone ?? "normal") === "offline";
                  return (
                    <DropColumn key={rack.id}>
                      <DropLine $offline={offline} data-testid="drop-line" data-offline={offline} />
                      <DcCb $offline={offline} data-testid="dc-cb" data-offline={offline} />
                      <Junction $offline={offline} />
                    </DropColumn>
                  );
                })}
              </Drops>
              <BusBar $left={53} aria-hidden="true">
                <BusBase />
                <BusActive $energized={energized} />
              </BusBar>
              <BusLabel>{bsc.dcBusLabel}</BusLabel>
              <RightSegment>
                {cbm ? (
                  <>
                    {cbm.imd ? (
                      <ImdChip data-testid="imd-chip">IMD {cbm.imd}</ImdChip>
                    ) : null}
                    <CbmBox>
                      <CbmTitle>{cbm.id}</CbmTitle>
                      <CbmState>{cbm.state}</CbmState>
                      <CbmValue>
                        {formatNumber(cbm.voltage, 0)} V·{formatNumber(cbm.current, 0)} A
                      </CbmValue>
                    </CbmBox>
                    <BoxConnector aria-hidden="true" />
                  </>
                ) : null}
                {cbm ? <WireState>{cbm.state}</WireState> : null}
                {pcsBlock ? (
                  <PcsGroup>
                    <PcsName>{pcsBlock.id}</PcsName>
                    <PcsSymbol />
                    <PcsState $tone={pcsBlock.tone ?? "success"}>{pcsBlock.state}</PcsState>
                    <PcsPower>{pcsBlock.power}</PcsPower>
                  </PcsGroup>
                ) : null}
                <CbSquare style={{ left: 267 }} aria-hidden="true" />
                <CbSquare style={{ left: 285 }} aria-hidden="true" />
                <AcSmallLabel style={{ left: 265 }}>AC BRK</AcSmallLabel>
                <CtBox aria-hidden="true" />
                <AcSmallLabel style={{ left: 305 }}>CT</AcSmallLabel>
                <GreenCb aria-hidden="true" data-testid="green-cb" />
                <NodeDot aria-hidden="true" />
              </RightSegment>
            </BscRow>
          );
        })}
      </Rows>
      <Side>
        <TrunkStack aria-hidden="true">
          <TrunkBase />
          <TrunkActive $energized={energized} />
        </TrunkStack>
        <AcStub aria-hidden="true">
          <AcStubBase />
          <AcStubActive $energized={energized} />
          <AcCircles>
            <AcCircle data-testid="ac-circle" />
            <AcCircle data-testid="ac-circle" />
          </AcCircles>
        </AcStub>
        <JunctionDot aria-hidden="true" />
        <AcSmallLabel style={{ left: 2, top: 104 }}>AC LV 690 V</AcSmallLabel>
        {trafo ? (
          <Trafo>
            <TrafoTitle>{trafo.title}</TrafoTitle>
            <TrafoLine>{trafo.voltage}</TrafoLine>
            <TrafoLine>{trafo.vector}</TrafoLine>
          </Trafo>
        ) : null}
        <Rmu>
          <RmuState>{rmu.state}</RmuState>
          <RmuTitle>
            {rmu.title}
            {rmu.values[0] ? ` · ${rmu.values[0].label} ${rmu.values[0].value}` : ""}
          </RmuTitle>
          <RmuLines>
            {rmu.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </RmuLines>
        </Rmu>
      </Side>
    </Diagram>
  </Card>
);

ElectricalSingleLine.displayName = "ElectricalSingleLine";
