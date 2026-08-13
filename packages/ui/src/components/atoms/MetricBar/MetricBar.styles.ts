import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const MetricBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: ${COLORS.borderDefault};
  border-radius: 4px;
  overflow: hidden;
`;

export const MetricBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${COLORS.info}, ${COLORS.success});
  border-radius: 4px;
  transition: width 0.3s ease;
`;
