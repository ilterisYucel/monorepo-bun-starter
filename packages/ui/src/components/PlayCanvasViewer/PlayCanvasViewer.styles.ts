import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Wrapper = styled.div<{ $height: number | string }>`
  width: 100%;
  height: ${({ $height }) =>
    typeof $height === "number" ? `${$height}px` : $height};
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${COLORS.borderDefault};
  background: ${COLORS.bgApp};
`;

export const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
`;

export const Overlay = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
  z-index: 10;
`;

export const Label = styled.div<{ $status: "online" | "warning" | "offline" | "idle" }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $status }) =>
    $status === "online"
      ? COLORS.success
      : $status === "warning"
        ? COLORS.warning
        : $status === "offline"
          ? COLORS.error
          : COLORS.textMuted};
  background: ${COLORS.bgCard};
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid
    ${({ $status }) =>
      $status === "online"
        ? COLORS.successAlpha25
        : $status === "warning"
          ? COLORS.warningAlpha25
          : $status === "offline"
            ? COLORS.errorAlpha25
            : COLORS.borderDefault};
`;

export const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${COLORS.textMuted};
  font-size: 14px;
`;
