// packages/ui/src/components/PowerFlowAnimation/PowerFlowAnimation.styles.ts
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const pulseChargeAnim = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 #10b98140; }
  50% { box-shadow: 0 0 0 8px #10b98120; }
`;

const pulseDischargeAnim = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 #f59e0b40; }
  50% { box-shadow: 0 0 0 8px #f59e0b20; }
`;

const fadeInAnim = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.div`
  background: #1f1f2e;
  border-radius: 20px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #2a2a3a;
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const FlowStatus = styled.div`
  padding: 6px 16px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const FlowStatusCharge = styled(FlowStatus)`
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b981;
  animation: ${pulseChargeAnim} 1.5s infinite;

  &::before {
    content: "🔌";
    font-size: 12px;
  }
`;

export const FlowStatusDischarge = styled(FlowStatus)`
  background: #f59e0b20;
  color: #f59e0b;
  border: 1px solid #f59e0b;
  animation: ${pulseDischargeAnim} 1.5s infinite;

  &::before {
    content: "⚡";
    font-size: 12px;
  }
`;

export const FlowStatusIdle = styled(FlowStatus)`
  background: #6b728020;
  color: #9ca3af;
  border: 1px solid #6b7280;

  &::before {
    content: "⏸️";
    font-size: 12px;
  }
`;

export const Legend = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #2a2a3a;
  flex-wrap: wrap;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9ca3af;
  background: #0f0f1a;
  padding: 6px 12px;
  border-radius: 24px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #1f1f2e;
    transform: translateY(-1px);
  }
`;

export const LegendBattery = styled.span`
  width: 20px;
  height: 14px;
  background: #1e1e2e;
  border: 1px solid #3d3d5e;
  border-radius: 3px;
  position: relative;

  &::after {
    content: "+";
    position: absolute;
    top: -4px;
    right: -2px;
    font-size: 8px;
    color: #3d3d5e;
  }
`;

export const LegendSwitch = styled.span`
  width: 16px;
  height: 16px;
  background: #fbbf24;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;

  &::after {
    content: "⚡";
    position: absolute;
    font-size: 8px;
    color: #1f1f2e;
  }
`;

export const LegendGrid = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fbbf24;
  background: #fef3c7;
`;

export const LegendFlowCharge = styled.span`
  width: 24px;
  height: 4px;
  background: #10b981;
  position: relative;
  border-radius: 2px;

  &::after {
    content: "←";
    position: absolute;
    right: -8px;
    top: -6px;
    color: #10b981;
    font-size: 12px;
    font-weight: bold;
  }
`;

export const LegendFlowDischarge = styled.span`
  width: 24px;
  height: 4px;
  background: #f59e0b;
  position: relative;
  border-radius: 2px;

  &::after {
    content: "→";
    position: absolute;
    right: -8px;
    top: -6px;
    color: #f59e0b;
    font-size: 12px;
    font-weight: bold;
  }
`;

export const LegendClick = styled.span`
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 4px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;

  &::after {
    content: "🔍";
    position: absolute;
    font-size: 10px;
  }
`;

export const Popover = styled.div`
  animation: ${fadeInAnim} 0.2s ease;
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
  backdrop-filter: blur(4px);
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

export const StatusBadge = styled.span`
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
