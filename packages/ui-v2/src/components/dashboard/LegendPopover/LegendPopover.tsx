import {
  Breaker,
  Divider,
  Dot,
  Item,
  Line,
  Marker,
  OfflineDot,
  Popover,
  SectionTitle,
} from "./LegendPopover.styles";

/** Info ekranı — konteyner durumu ve şema sembolleri açıklaması. */
export const LegendPopover = ({ className }: { className?: string }) => (
  <Popover className={className} role="dialog" aria-label="Legend">
    <SectionTitle>Container state</SectionTitle>
    <Divider />
    <Item>
      <Marker>
        <Dot $tone="success" />
      </Marker>
      Online
    </Item>
    <Item>
      <Marker>
        <Dot $tone="warning" />
      </Marker>
      Warning
    </Item>
    <Item>
      <Marker>
        <Dot $tone="critical" />
      </Marker>
      Fault
    </Item>
    <Item>
      <Marker>
        <OfflineDot />
      </Marker>
      Offline
    </Item>
    <SectionTitle>Lines &amp; symbols</SectionTitle>
    <Divider />
    <Item>
      <Marker>
        <Line $tone="warning" />
      </Marker>
      Discharge path
    </Item>
    <Item>
      <Marker>
        <Line $tone="critical" />
      </Marker>
      Max cell V module
    </Item>
    <Item>
      <Marker>
        <Line $tone="info" />
      </Marker>
      Min cell V module
    </Item>
    <Item>
      <Marker>
        <Breaker />
      </Marker>
      Breaker closed
    </Item>
  </Popover>
);

LegendPopover.displayName = "LegendPopover";
