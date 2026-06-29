import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "../../../colors";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Popover = styled.div`
  animation: ${fadeIn} 0.18s ease;
  position: fixed;
  z-index: 1000;
`;

export const PopoverContent = styled.div`
  background: ${COLORS.bgPopup};
  border: 1px solid ${COLORS.info};
  border-radius: 16px;
  padding: 14px 18px;
  min-width: 240px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
`;

export const PopoverHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const PopoverHeaderStrong = styled.strong`
  color: ${COLORS.textPrimary};
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "🔋";
    font-size: 14px;
  }
`;

const StatusBadge = styled.span`
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
`;

export const StatusBadgeOnline = styled(StatusBadge)`
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.successAlpha25};
`;

export const StatusBadgeOffline = styled(StatusBadge)`
  background: ${COLORS.errorAlpha12};
  color: ${COLORS.error};
  border: 1px solid ${COLORS.errorAlpha25};
`;

export const PopoverBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const PopoverRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: ${COLORS.textMuted};
  padding: 2px 0;
`;

export const PopoverRowStrong = styled.strong`
  color: ${COLORS.textPrimary};
  font-weight: 600;
`;

export const ChargeStatusCharge = styled.span`
  color: ${COLORS.success};
  font-weight: 600;
`;

export const ChargeStatusDischarge = styled.span`
  color: ${COLORS.warning};
  font-weight: 600;
`;

export const ChargeStatusIdle = styled.span`
  color: ${COLORS.textDisabled};
  font-weight: 600;
`;
