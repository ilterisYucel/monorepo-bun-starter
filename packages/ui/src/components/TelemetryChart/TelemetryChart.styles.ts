// packages/ui/src/components/TelemetryChart/TelemetryChart.styles.ts
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "../../colors";

const pulse = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.4; }
`;

export const Container = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 16px;
  border: 1px solid ${COLORS.borderDefault};
  overflow: hidden;
`;

export const Header = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const HeaderTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

export const HeaderAnnotations = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

export const HeaderAnnotationGroup = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${COLORS.textMuted};
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  cursor: pointer;
`;

export const HeaderTitle = styled.h3`
  margin: 0;
  color: ${COLORS.textPrimary};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

export const HeaderSubtitle = styled.p`
  margin: 3px 0 0 0;
  color: ${COLORS.textDisabled};
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

export const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const ControlLabel = styled.label`
  color: ${COLORS.textMuted};
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

export const ControlSelect = styled.select`
  background: ${COLORS.bgPanel};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${COLORS.info};
  }

  &:focus-visible {
    outline: 1px solid ${COLORS.info};
    outline-offset: -1px;
  }
`;

export const DropdownWrapper = styled.div`
  position: relative;
`;

export const DropdownTrigger = styled.button`
  background: ${COLORS.bgPanel};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
  white-space: nowrap;
  min-width: 80px;
  text-align: left;

  &:hover {
    border-color: ${COLORS.info};
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 140px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  padding: 4px 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 20;
  max-height: 240px;
  overflow-y: auto;
`;

export const DropdownItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  color: ${COLORS.textLight};
  transition: background 0.1s;

  &:hover {
    background: ${COLORS.bgSkeleton};
  }
`;

export const Checkbox = styled.input`
  accent-color: ${COLORS.info};
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
`;

export const DropdownDivider = styled.div`
  height: 1px;
  background: ${COLORS.borderDefault};
  margin: 4px 0;
`;

export const Skeleton = styled.div`
  animation: ${pulse} 1.8s ease-in-out infinite;
  background: ${COLORS.bgSkeleton};
  border-radius: 12px;
`;

export const ErrorBox = styled.div`
  padding: 24px;
  text-align: center;
`;

export const ErrorTitle = styled.p`
  color: ${COLORS.error};
  font-size: 14px;
  font-weight: 500;
`;

export const ErrorDetail = styled.p`
  color: ${COLORS.textMuted};
  font-size: 12px;
  margin-top: 4px;
`;
