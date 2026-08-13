import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const DataRowContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${COLORS.bgInput};
  padding: 8px 10px;
  border-radius: 8px;
`;

export const DataIcon = styled.span`
  font-size: 15px;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const DataLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const DataValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;
