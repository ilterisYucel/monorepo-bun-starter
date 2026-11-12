import styled from "@emotion/styled";
import { FONT_FAMILY } from "@gd-monorepo/ui-v2";

export const Shell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bgPage};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${FONT_FAMILY};
`;

export const Content = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
`;
