import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const ReportsPageContainer = styled.div`
  padding: 8px;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ReportsPlaceholder = styled.div`
  text-align: center;
  padding: 60px;
  background: ${COLORS.bgCard};
  border-radius: 24px;
  border: 1px solid ${COLORS.borderDefault};
  max-width: 500px;

  p {
    color: ${COLORS.textMuted};
    margin: 8px 0;
  }
`;

export const PlaceholderIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
`;
