import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const MetricDisplayContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px 14px;
  background: ${COLORS.bgInput};
  border-radius: 14px;
`;

export const MetricValue = styled.div`
  font-size: 42px;
  font-weight: 800;
  color: ${COLORS.info};
  line-height: 1;
  margin-bottom: 4px;
`;

export const MetricLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.textMuted};
  margin-bottom: 12px;
`;
