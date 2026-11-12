import { StatusPill } from "../../primitives/StatusPill";
import { Pills, Row, Subtitle, Title, TitleBlock } from "./TabRow.styles";
import type { TabRowProps } from "./TabRow.types";

/** Başlık bloğu + durum pill'leri. */
export const TabRow = ({ title, subtitle, pills, className }: TabRowProps) => (
  <Row className={className}>
    <TitleBlock>
      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>
    </TitleBlock>
    <Pills>
      {pills.map((pill) => (
        <StatusPill key={pill.label} tone={pill.tone}>
          {pill.label}
        </StatusPill>
      ))}
    </Pills>
  </Row>
);

TabRow.displayName = "TabRow";
