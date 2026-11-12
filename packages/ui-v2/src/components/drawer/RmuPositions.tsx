import { Badge } from "../primitives/Badge";
import { PosCard, PosName, PosRow, Section, SectionHead, SectionTitle } from "./Drawer.styles";
import type { RmuPosition } from "./types";

/** RMU pozisyonları — H01/H02/H03 durum rozetleri. */
export const RmuPositions = ({ positions }: { positions: RmuPosition[] }) => (
  <Section>
    <SectionHead>
      <SectionTitle>RMU positions</SectionTitle>
    </SectionHead>
    <PosRow>
      {positions.map((position) => (
        <PosCard key={position.id}>
          <PosName>{position.id}</PosName>
          <Badge tone={position.tone}>{position.state}</Badge>
        </PosCard>
      ))}
    </PosRow>
  </Section>
);
