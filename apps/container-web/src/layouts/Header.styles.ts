import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const AppHeader = styled.header`
  padding: 16px 24px;
  background: ${COLORS.bgCard};
  border-bottom: 1px solid ${COLORS.borderDefault};
  margin-bottom: 24px;
`;

export const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
  margin: 0;
`;
