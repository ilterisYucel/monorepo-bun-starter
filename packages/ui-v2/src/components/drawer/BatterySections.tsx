import { formatNumber } from "../../utils";
import {
  BankCard,
  BankGrid,
  BankTitle,
  BankValue,
  Caption,
  Section,
  SectionHead,
  SectionTitle,
} from "./Drawer.styles";
import type { BankReading } from "./types";

/** Bank A / Bank B — yüksek okuma amber vurgulu. */
export const BatterySections = ({ banks }: { banks: BankReading[] }) => (
  <Section>
    <SectionHead>
      <SectionTitle>Battery sections</SectionTitle>
    </SectionHead>
    <BankGrid>
      {banks.map((bank) => (
        <BankCard key={bank.id}>
          <BankTitle>{bank.id}</BankTitle>
          <BankValue $high={bank.high ?? false}>SoC · SoH {formatNumber(bank.soc, 1)} · {formatNumber(bank.soh, 1)} %</BankValue>
          <BankValue $high={false}>
            {formatNumber(bank.voltage, 0)} V · {formatNumber(bank.current, 0)} A
          </BankValue>
          <BankValue $high={bank.high ?? false}>{formatNumber(bank.temperature, 1)} °C</BankValue>
        </BankCard>
      ))}
    </BankGrid>
    <Caption>Her bank kendi BSC'sinden gelir · yüksek okuma amber</Caption>
  </Section>
);
