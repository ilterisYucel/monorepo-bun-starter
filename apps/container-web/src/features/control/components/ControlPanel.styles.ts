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

export const ControlPanelContainer = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  padding: 24px;
  border: 1px solid ${COLORS.borderDefault};
`;

export const PanelTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  color: ${COLORS.textPrimary};
  font-weight: 600;
`;

export const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 8px;
    color: ${COLORS.textMuted};
    font-size: 13px;
    font-weight: 500;
  }
`;

export const InputsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

export const FormHint = styled.span`
  display: block;
  margin-top: 6px;
  color: ${COLORS.textDisabled};
  font-size: 11px;
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

export const ControlButtons = styled.div`
  display: flex;
  gap: 12px;

  button {
    flex: 1;
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

export const BtnCharge = styled.button`
  background: ${COLORS.success};
  color: white;

  &:hover:not(:disabled) {
    background: ${COLORS.successHover};
    transform: translateY(-1px);
  }
`;

export const BtnDischarge = styled.button`
  background: ${COLORS.warning};
  color: white;

  &:hover:not(:disabled) {
    background: ${COLORS.warningHover};
    transform: translateY(-1px);
  }
`;

export const BtnStop = styled.button`
  background: ${COLORS.error};
  color: white;

  &:hover:not(:disabled) {
    background: ${COLORS.errorHover};
    transform: translateY(-1px);
  }
`;

export const TimerDisplay = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${COLORS.borderDefault};
  display: flex;
  justify-content: center;
`;

export const TimerRing = styled.div`
  background: ${COLORS.bgInput};
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid ${COLORS.info};
  animation: ${pulse} 1s infinite;
`;

export const TimerTime = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${COLORS.info};
  font-family: monospace;
`;

export const TimerLabel = styled.div`
  font-size: 10px;
  color: ${COLORS.textMuted};
  margin-top: 4px;
`;
