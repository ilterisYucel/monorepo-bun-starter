import { formatNumber } from "../../utils";
import {
  Caption,
  Cell,
  CmaCells,
  CmaColumn,
  CmaGrid,
  CmaTitle,
  Section,
  SectionHead,
  SectionTitle,
  Stat,
  StatGrid,
  StatLabel,
  StatValue,
} from "./Drawer.styles";
import type { PackDetail } from "./types";

/** Seçili pack — CMA 4→1 hücre ısı haritası ve donanım özeti. */
export const SelectedPack = ({ pack }: { pack: PackDetail }) => {
  const cmaNames = Array.from(new Set(pack.cells.map((cell) => cell.cma)));

  return (
    <Section>
      <SectionHead>
        <SectionTitle>Selected pack {pack.id}</SectionTitle>
        <Caption>CMA 4 → CMA 1</Caption>
      </SectionHead>
      <CmaGrid>
        {cmaNames.map((cma) => (
          <CmaColumn key={cma}>
            <CmaTitle>{cma}</CmaTitle>
            <CmaCells>
              {pack.cells
                .filter((cell) => cell.cma === cma)
                .map((cell) => (
                  <Cell key={`${cma}-${cell.index}`} $tone={cell.tone ?? "normal"}>
                    {formatNumber(cell.value, 0)}
                  </Cell>
                ))}
            </CmaCells>
          </CmaColumn>
        ))}
      </CmaGrid>
      <Caption>Front (cell 24) solda → arka (cell 1) sağda · 1 film NTC her CMA'da</Caption>
      <StatGrid>
        {pack.hardware.map((item) => (
          <Stat key={item.label}>
            <StatLabel>{item.label}</StatLabel>
            <StatValue>{item.value}</StatValue>
          </Stat>
        ))}
      </StatGrid>
    </Section>
  );
};
