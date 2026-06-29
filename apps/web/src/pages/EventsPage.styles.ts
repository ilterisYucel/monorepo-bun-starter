import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const EventsPageContainer = styled.div`
  padding: 8px;
`;

export const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  overflow-x: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const EventsCard = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  border: 1px solid ${COLORS.borderDefault};
  overflow: hidden;

  h3 {
    padding: 16px 20px;
    margin: 0;
    background: ${COLORS.bgInput};
    border-bottom: 1px solid ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
    font-size: 14px;
    font-weight: 600;
  }
`;
