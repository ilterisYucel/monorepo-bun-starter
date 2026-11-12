import { PcsLabel, PcsRow, PcsTable, PcsValue, Section, SectionHead, SectionTitle } from "./Drawer.styles";
import type { PcsRow as PcsRowData } from "./types";

/** PCS tablosu — durum, güç, AC gerilim. */
export const PcsTableView = ({ rows }: { rows: PcsRowData[] }) => (
  <Section>
    <SectionHead>
      <SectionTitle>PCS</SectionTitle>
    </SectionHead>
    <PcsTable>
      {rows.map((row) => (
        <PcsRow key={row.id}>
          <PcsLabel>
            {row.id} · {row.acVoltage}
          </PcsLabel>
          <PcsValue $tone={row.tone}>
            {row.state} · {row.power}
          </PcsValue>
        </PcsRow>
      ))}
    </PcsTable>
  </Section>
);
