import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { COLORS } from "../../../colors";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  background: ${COLORS.bgInput};
  border-radius: 16px 16px 0 0;
  flex-shrink: 0;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const DeviceLabel = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: ${COLORS.textPrimary};
  font-family: monospace;
`;

export const FlowBadge = styled.span<{ $status: string }>`
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  ${({ $status }) =>
    $status === "Charge"
      ? css`background: ${COLORS.successAlpha12}; color: ${COLORS.success}; border: 1px solid ${COLORS.success};`
      : $status === "Discharge"
        ? css`background: ${COLORS.warningAlpha12}; color: ${COLORS.warning}; border: 1px solid ${COLORS.warning};`
        : css`background: ${COLORS.idleAlpha12}; color: ${COLORS.textMuted}; border: 1px solid ${COLORS.textDisabled};`}
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const IconBtn = styled.button`
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textMuted};
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
  }
`;

export const CanvasWrap = styled.div`
  position: relative;
  overflow: hidden;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${COLORS.textDisabled};
  font-size: 14px;
`;
