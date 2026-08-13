import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const CardContainer = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    border-color: ${COLORS.info};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;
