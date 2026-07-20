import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const CardContainer = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 14px;
  padding: 16px;
  border: 1px solid ${COLORS.borderDefault};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const CardIcon = styled.div`
  color: ${COLORS.info};
  display: flex;
`;

export const CardTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.textPrimary};
  line-height: 1.3;
  flex: 1;
`;

export const MetaBadge = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  background: ${COLORS.bgInput};
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
`;

export const CardDescription = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${COLORS.textMuted};
  line-height: 1.5;
`;

export const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${COLORS.textDisabled};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: -4px;
`;

export const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: ${COLORS.bgInput};
  border-radius: 10px;
  padding: 8px 10px;
`;

export const StepRow = styled.div<{ $status: "pending" | "success" | "failed" }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${(p) => (p.$status === "success" ? COLORS.success : p.$status === "failed" ? COLORS.error : COLORS.textMuted)};
`;

export const StepDevice = styled.span`
  width: 50px;
  font-weight: 600;
  font-size: 11px;
  color: ${COLORS.textPrimary};
`;

export const StepCommand = styled.span`
  flex: 1;
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const StepStatus = styled.span`
  display: flex;
`;

export const PendingDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${COLORS.textMuted};
  opacity: 0.4;
`;

export const TimerDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.infoAlpha12};
  border-radius: 8px;
  padding: 6px 10px;
`;

export const TimerTime = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.info};
  font-variant-numeric: tabular-nums;
`;

export const TimerLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const TimerCheckbox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${COLORS.info};

  &:disabled {
    cursor: not-allowed;
  }
`;

export const CheckboxLabel = styled.label`
  font-size: 12px;
  color: ${COLORS.textMuted};
  cursor: pointer;
  user-select: none;
`;

export const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const CountdownText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.info};
`;

export const ScheduleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const ScheduleInput = styled.input`
  flex: 1;
  min-width: 0;
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  color: ${COLORS.textPrimary};
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: ${COLORS.info};
  }
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  position: relative;
`;

const btnBase = `
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const smallBtnBase = `
  ${btnBase}
  padding: 5px 10px;
  font-size: 12px;
`;

export const RunBtn = styled.button`
  ${btnBase}
  background: ${COLORS.info};
  color: #fff;
  border-radius: 8px 0 0 8px;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

export const DropdownToggle = styled.button`
  ${btnBase}
  background: ${COLORS.info};
  color: #fff;
  border-radius: 0 8px 8px 0;
  padding: 6px 8px;
  margin-left: 1px;

  &::after {
    content: "▾";
    font-size: 10px;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

export const SplitButton = styled.div<{ disabled: boolean }>`
  display: inline-flex;
  opacity: ${(p) => (p.disabled ? 0.4 : 1)};
  position: relative;
`;

export const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 140px;
  padding: 4px;
`;

export const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${COLORS.textPrimary};
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${COLORS.bgHover};
  }
`;

export const ScheduleBtn = styled.button`
  ${smallBtnBase}
  background: ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};

  &:hover:not(:disabled) {
    background: ${COLORS.borderHover};
  }
`;

export const CancelBtn = styled.button`
  ${smallBtnBase}
  background: transparent;
  color: ${COLORS.textMuted};
  border: 1px solid ${COLORS.borderDefault};

  &:hover:not(:disabled) {
    border-color: ${COLORS.error};
    color: ${COLORS.error};
  }
`;

export const RetryBtn = styled.button`
  ${btnBase}
  background: ${COLORS.warning};
  color: #fff;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

export const RollbackBtn = styled.button`
  ${btnBase}
  background: transparent;
  color: ${COLORS.error};
  border: 1px solid ${COLORS.error};

  &:hover:not(:disabled) {
    background: ${COLORS.errorAlpha12};
  }
`;
