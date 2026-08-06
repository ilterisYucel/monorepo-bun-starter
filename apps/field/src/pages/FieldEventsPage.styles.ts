import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  overflow-x: hidden;
`;

export const EventsCard = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  border: 1px solid ${COLORS.borderDefault};
  overflow: hidden;
`;
