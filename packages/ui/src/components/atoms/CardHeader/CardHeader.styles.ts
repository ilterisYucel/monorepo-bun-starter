import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const CardHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 6px;
`;

export const CardName = styled.span`
  font-weight: 700;
  color: ${COLORS.textPrimary};
  font-size: 16px;
  letter-spacing: 0.5px;
`;

export const CardBadges = styled.div`
  display: flex;
  gap: 6px;
`;
