import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "@gd-monorepo/ui";

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 ${COLORS.infoAlpha25};
  }
  50% {
    box-shadow: 0 0 0 10px ${COLORS.infoAlpha12};
  }
`;

export const SchedulerContainer = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  border: 1px solid ${COLORS.borderDefault};
  padding: 24px;
  color: ${COLORS.textPrimary};

  h4 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
  }
`;

export const SchedulerForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const FormGroup = styled.div`
  label {
    display: block;
    margin-bottom: 8px;
    color: ${COLORS.textMuted};
    font-size: 13px;
    font-weight: 500;
  }
`;

export const FormRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  label {
    font-size: 13px;
    color: ${COLORS.textMuted};
    font-weight: 500;
    width: 100px;
  }

  select,
  input {
    flex: 1;
    background: ${COLORS.bgInput};
    border: 1px solid ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      border-color: ${COLORS.info};
    }
  }
`;

export const ModeButtons = styled.div`
  display: flex;
  gap: 12px;
`;

export const ModeBtn = styled.button<{ active: boolean }>`
  flex: 1;
  background: ${({ active }) => (active ? COLORS.info : COLORS.bgInput)};
  border: 1px solid ${({ active }) => (active ? COLORS.info : COLORS.borderDefault)};
  color: ${({ active }) => (active ? "white" : COLORS.textMuted)};
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: ${COLORS.info};
    color: ${({ active }) => (active ? "white" : COLORS.textPrimary)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const DateTimeInput = styled.input`
  flex: 1;
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: ${COLORS.info};
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

export const AddBtn = styled.button`
  background: ${COLORS.info};
  border: none;
  color: white;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 4px;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.infoHover};
    transform: translateY(-1px);
  }
`;

export const ScheduledList = styled.div`
  h5 {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: ${COLORS.textMuted};
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${COLORS.bgInput};
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 12px;
      gap: 8px;
    }
  }
`;

export const CmdDate = styled.span`
  flex: 2;
  color: ${COLORS.textMuted};
  font-size: 11px;
`;

export const CmdType = styled.span<{ variant: "charge" | "discharge" }>`
  flex: 1;
  font-weight: bold;
  text-align: center;
  color: ${({ variant }) =>
    variant === "charge" ? COLORS.success : COLORS.warning};
`;

export const CmdPower = styled.span`
  flex: 1;
  color: ${COLORS.textPrimary};
  text-align: right;
`;

export const CmdTimer = styled.span`
  flex: 1;
  color: ${COLORS.info};
  font-size: 11px;
  text-align: center;
`;

export const DeleteBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export const EmptyText = styled.p`
  text-align: center;
  font-size: 12px;
  color: ${COLORS.textDisabled};
  padding: 20px;
`;
