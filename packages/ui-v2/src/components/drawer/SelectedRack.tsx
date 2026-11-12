import { formatNumber } from "../../utils";
import {
  Caption,
  Section,
  SectionHead,
  SectionTitle,
  Stat,
  StatGrid,
  StatLabel,
  StatValue,
} from "./Drawer.styles";
import type { DrawerRack } from "./types";

/** Seçili rack özeti — SoC, sıcaklık, gerilim, akım ve hücre uçları. */
export const SelectedRack = ({ rack }: { rack: DrawerRack }) => (
  <Section>
    <SectionHead>
      <SectionTitle>Selected rack · {rack.id}</SectionTitle>
      <Caption>
        {formatNumber(rack.cellTempMin, 1)} – {formatNumber(rack.cellTempMax, 1)} °C
      </Caption>
    </SectionHead>
    <StatGrid>
      <Stat>
        <StatLabel>SoC · SoH</StatLabel>
        <StatValue>
          {formatNumber(rack.soc, 1)} % · {formatNumber(rack.soh, 1)} %
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel>Temperature</StatLabel>
        <StatValue>{formatNumber(rack.temperature, 1)} °C</StatValue>
      </Stat>
      <Stat>
        <StatLabel>Voltage · current</StatLabel>
        <StatValue>
          {formatNumber(rack.voltage, 0)} V · {formatNumber(rack.current, 0)} A
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel>Cell V max · min</StatLabel>
        <StatValue>
          {formatNumber(rack.cellVoltageMax, 0)} · {formatNumber(rack.cellVoltageMin, 0)} mV
        </StatValue>
      </Stat>
    </StatGrid>
  </Section>
);
