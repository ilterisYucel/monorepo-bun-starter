import { formatNumber } from "../../../utils";
import {
  Body,
  Chip,
  ChipRow,
  Dot,
  Dots,
  Head,
  Humidity,
  OverTemp,
  PanelCard,
  PanelFoot,
  PanelSub,
  PanelTitle,
  PlanCard,
  Reading,
  Readings,
  RoomCard,
  RoomHead,
  RoomName,
  RoomRange,
  Rooms,
  Scale,
  ScaleFill,
  ScaleMark,
  ScaleTrack,
  Temp,
  TempLine,
  Unit,
} from "./ContainerPlan.styles";
import type { ContainerPlanProps } from "./ContainerPlan.types";

/** Konteyner planı — Panel + Room 1–4, H1–H8 chip'leri, over-temp durumu. */
export const ContainerPlan = ({ title = "Container plan", panel, rooms, className }: ContainerPlanProps) => (
  <PlanCard className={className}>
    <Head>{title}</Head>
    <Body>
      <PanelCard>
        <div>
          <PanelTitle>Panel</PanelTitle>
          <PanelSub>{panel.subtitle}</PanelSub>
        </div>
        <TempLine>
          <Temp>{formatNumber(panel.temperature, 1)}</Temp>
          <Unit>°C</Unit>
        </TempLine>
        <Scale>
          <ScaleTrack />
          <ScaleFill $pct={panel.scalePct} />
          <ScaleMark $pct={panel.scalePct} />
        </Scale>
        <PanelFoot>
          <span>{panel.footerLeft}</span>
          <span>{panel.footerRight}</span>
        </PanelFoot>
      </PanelCard>
      <Rooms>
        {rooms.map((room) => (
          <RoomCard key={room.key} $overTemp={room.overTemp ?? false}>
            <RoomHead>
              <RoomName>{room.label}</RoomName>
              <RoomRange>{room.range}</RoomRange>
              {room.overTemp ? <OverTemp>OVER TEMP</OverTemp> : null}
              <Dots>
                {room.dots.map((tone, index) => (
                  <Dot key={index} $tone={tone} aria-hidden="true" />
                ))}
              </Dots>
            </RoomHead>
            <TempLine>
              <Temp>{formatNumber(room.temperature, 1)}</Temp>
              <Unit>°C</Unit>
            </TempLine>
            <Scale>
              <ScaleTrack />
              <ScaleFill $pct={room.scalePct} />
              <ScaleMark $pct={room.scalePct} />
            </Scale>
            <Readings>
              <Reading $tone="info">Supply {formatNumber(room.supply, 1)}</Reading>
              <Reading $tone="critical">Return {formatNumber(room.ret, 1)}</Reading>
            </Readings>
            <ChipRow>
              {room.chips.map((chip) => (
                <Chip key={chip.label}>
                  {chip.label} · {formatNumber(chip.pct, 0)} %
                </Chip>
              ))}
              <Humidity>{formatNumber(room.humidity, 0)} %rh</Humidity>
            </ChipRow>
          </RoomCard>
        ))}
      </Rooms>
    </Body>
  </PlanCard>
);

ContainerPlan.displayName = "ContainerPlan";
