import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

const badgeBase = styled.span`
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const Online = styled(badgeBase)`
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.success};
`;

export const Offline = styled(badgeBase)`
  background: ${COLORS.errorAlpha12};
  color: ${COLORS.error};
  border: 1px solid ${COLORS.error};
`;

export const Charge = styled(badgeBase)`
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.success};
`;

export const Discharge = styled(badgeBase)`
  background: ${COLORS.warningAlpha12};
  color: ${COLORS.warning};
  border: 1px solid ${COLORS.warning};
`;

export const Idle = styled(badgeBase)`
  background: ${COLORS.idleAlpha12};
  color: ${COLORS.textMuted};
  border: 1px solid ${COLORS.textDisabled};
`;
