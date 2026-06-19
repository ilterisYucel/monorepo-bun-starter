import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

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
  background: #1f1f2e;
  border: 1px solid #3b82f6;
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
  border-bottom: 1px solid #2a2a3a;
`;

export const PopoverHeaderStrong = styled.strong`
  color: #e5e7eb;
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
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b98140;
`;

export const StatusBadgeOffline = styled(StatusBadge)`
  background: #ef444420;
  color: #ef4444;
  border: 1px solid #ef444440;
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
  color: #9ca3af;
  padding: 2px 0;
`;

export const PopoverRowStrong = styled.strong`
  color: #e5e7eb;
  font-weight: 600;
`;

export const ChargeStatusCharge = styled.span`
  color: #10b981;
  font-weight: 600;
`;

export const ChargeStatusDischarge = styled.span`
  color: #f59e0b;
  font-weight: 600;
`;

export const ChargeStatusIdle = styled.span`
  color: #6b7280;
  font-weight: 600;
`;
