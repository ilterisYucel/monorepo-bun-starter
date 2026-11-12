import {
  Band,
  BandMarker,
  BandSegment,
  BandTrack,
  Bar,
  BarLabel,
  Bars,
  Caption,
  Card,
  Fill,
  Kv,
  KvLabel,
  KvRow,
  KvValue,
  Label,
  Row,
  Track,
  TrackOnly,
  Unit,
  Value,
  ValueLine,
} from "./KpiRow.styles";
import type { KpiRowProps } from "./KpiRow.types";

/** Dashboard KPI satırı — C01, 6 kart. */
export const KpiRow = ({ items, className }: KpiRowProps) => (
  <Row className={className}>
    {items.map((item) => (
      <Card key={item.key}>
        <Label>{item.label}</Label>
        <ValueLine $tone={item.tone}>
          <Value $size={item.valueSize ?? "default"}>{item.value}</Value>
          {item.unit ? <Unit>{item.unit}</Unit> : null}
        </ValueLine>
        {item.bars?.length ? (
          <Bars>
            {item.bars.map((bar) => (
              <Bar key={bar.label}>
                <BarLabel>{bar.label}</BarLabel>
                <Track>
                  <Fill $pct={bar.pct} $tone={item.tone ?? "success"} />
                </Track>
              </Bar>
            ))}
          </Bars>
        ) : null}
        {item.kv?.length ? (
          <Kv>
            {item.kv.map((row) => (
              <KvRow key={row.label}>
                <KvLabel>{row.label}</KvLabel>
                <KvValue>{row.value}</KvValue>
              </KvRow>
            ))}
          </Kv>
        ) : null}
        {item.track ? (
          <TrackOnly>
            <Track>
              <Fill $pct={item.track.pct} $tone={item.track.tone} />
            </Track>
          </TrackOnly>
        ) : null}
        {item.band ? (
          <Band>
            <BandTrack />
            <BandSegment $start={item.band.start} $width={item.band.width} />
            {item.band.markers?.map((marker, index) => (
              <BandMarker key={index} $pct={marker.pct} $tone={marker.tone} />
            ))}
          </Band>
        ) : null}
        {item.caption ? <Caption>{item.caption}</Caption> : null}
      </Card>
    ))}
  </Row>
);

KpiRow.displayName = "KpiRow";
