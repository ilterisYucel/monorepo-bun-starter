import styled from "@emotion/styled";
import { COLORS } from "../../../colors";

export const Container = styled.div`
  background: ${COLORS.bgCard};
  overflow: hidden;
  width: 100%;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: ${COLORS.bgInput};
  border-bottom: 1px solid ${COLORS.borderDefault};
  min-height: 44px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DeviceLabel = styled.span`
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.textPrimary};
`;

export const FlowBadge = styled.span<{ $status: string }>`
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${({ $status }) =>
    $status === "Charge" ? COLORS.success : $status === "Discharge" ? COLORS.warning : COLORS.textDisabled};
  background: ${({ $status }) =>
    $status === "Charge" ? COLORS.successAlpha12 : $status === "Discharge" ? COLORS.warningAlpha12 : COLORS.idleAlpha12};
`;

export const BSCLabel = styled.span`
  font-family: monospace;
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const ZoomButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? COLORS.infoAlpha12 : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? COLORS.infoAlpha25 : "transparent")};
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? COLORS.info : COLORS.textMuted)};
  display: flex;
  align-items: center;
  transition: all 0.15s ease;

  &:hover {
    color: ${COLORS.info};
    background: ${COLORS.infoAlpha8};
  }
`;

export const IconBtn = styled.button`
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  color: ${COLORS.textMuted};
  display: flex;
  align-items: center;
  transition: all 0.15s ease;

  &:hover {
    color: ${COLORS.info};
    background: ${COLORS.infoAlpha8};
  }
`;

export const CanvasWrap = styled.div`
  width: 100%;
  overflow: hidden;
  cursor: default;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${COLORS.textMuted};
  font-size: 14px;
`;
