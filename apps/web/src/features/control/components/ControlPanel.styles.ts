import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 #3b82f640;
  }
  50% {
    box-shadow: 0 0 0 10px #3b82f620;
  }
`;

export const ControlPanelContainer = styled.div`
  background: #1a1a2e;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid #2a2a3a;
`;

export const PanelTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #e5e7eb;
  font-weight: 600;
`;

export const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 8px;
    color: #9ca3af;
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
  color: #6b7280;
  font-size: 11px;
`;

export const ModeButtons = styled.div`
  display: flex;
  gap: 12px;
`;

export const ModeBtn = styled.button<{ active: boolean }>`
  flex: 1;
  background: ${({ active }) => (active ? "#3b82f6" : "#0f0f1a")};
  border: 1px solid ${({ active }) => (active ? "#3b82f6" : "#2a2a3a")};
  color: ${({ active }) => (active ? "white" : "#9ca3af")};
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: ${({ active }) => (active ? "white" : "#e5e7eb")};
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
  background: #10b981;
  color: white;

  &:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
  }
`;

export const BtnDischarge = styled.button`
  background: #f59e0b;
  color: white;

  &:hover:not(:disabled) {
    background: #d97706;
    transform: translateY(-1px);
  }
`;

export const BtnStop = styled.button`
  background: #ef4444;
  color: white;

  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
  }
`;

export const TimerDisplay = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #2a2a3a;
  display: flex;
  justify-content: center;
`;

export const TimerRing = styled.div`
  background: #0f0f1a;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #3b82f6;
  animation: ${pulse} 1s infinite;
`;

export const TimerTime = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
  font-family: monospace;
`;

export const TimerLabel = styled.div`
  font-size: 10px;
  color: #9ca3af;
  margin-top: 4px;
`;
