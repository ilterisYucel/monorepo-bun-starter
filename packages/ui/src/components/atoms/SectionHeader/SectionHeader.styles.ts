import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const SectionHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  margin-top: 8px;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${COLORS.borderDefault};
  }
`;

export const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
  margin: 0;
`;
