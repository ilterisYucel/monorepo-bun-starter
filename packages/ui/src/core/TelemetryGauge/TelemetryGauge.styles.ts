// packages/ui/src/core/TelemetryGauge/TelemetryGauge.styles.ts
import styled from "@emotion/styled";
import type { GaugeSizes } from "./TelemetryGauge.types";

// ---------- Sizes ----------

const CIRCLE_SIZE: Record<GaugeSizes, number> = {
  small: 100,
  medium: 140,
  large: 180,
};
const RING_GAP: Record<GaugeSizes, number> = { small: 4, medium: 5, large: 6 };
const RING_WIDTH: Record<GaugeSizes, number> = {
  small: 5,
  medium: 7,
  large: 9,
};

function wrapperSize(size: GaugeSizes): number {
  return CIRCLE_SIZE[size] + 2 * (RING_GAP[size] + RING_WIDTH[size]);
}

// ---------- Container ----------

export const GaugeContainer = styled.div<{
  size?: "small" | "medium" | "large";
  $variant?: "linear" | "circular";
  $bordered?: boolean;
}>`
  box-sizing: border-box;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;
  background: #1a1a2e;

  ${({ $variant, size }) => {
    if ($variant === "circular") {
      const s = CIRCLE_SIZE[size ?? "medium"];
      return `
        border-radius: 50%;
        width: ${s}px;
        height: ${s}px;
        min-width: unset;
        padding: 0;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      `;
    }
    return `
      border-radius: 16px;
      border: 1px solid #2a2a3a;
      padding: ${size === "small" ? "12px" : size === "large" ? "24px" : "16px"};
      min-width: ${size === "small" ? "100px" : size === "large" ? "180px" : "140px"};
    `;
  }}

  ${({ $bordered }) =>
    $bordered ? `border: 1px solid #2a2a3a;` : `border: none;`}

  &:hover {
    transform: translateY(-2px);
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

// ---------- Wrapper (ring mode outer) ----------

export const GaugeWrapper = styled.div<{ size?: GaugeSizes }>`
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 50%;
  width: ${({ size }) => wrapperSize(size ?? "medium")}px;
  height: ${({ size }) => wrapperSize(size ?? "medium")}px;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

// ---------- Linear components ----------

export const Icon = styled.div`
  font-size: 28px;
  margin-bottom: 12px;
`;

export const Label = styled.div<{ size?: "small" | "medium" | "large" }>`
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  font-size: ${(props) =>
    props.size === "small" ? "11px" : props.size === "large" ? "15px" : "13px"};
`;

export const ValueContainer = styled.div`
  font-weight: 700;
  color: #e5e7eb;
  line-height: 1.2;
  margin-bottom: 12px;
`;

export const ValueNumber = styled.span<{ size?: "small" | "medium" | "large" }>`
  font-size: ${(props) =>
    props.size === "small" ? "20px" : props.size === "large" ? "36px" : "28px"};
`;

export const Unit = styled.span`
  font-size: 0.5em;
  margin-left: 2px;
  color: #9ca3af;
  font-weight: 400;
`;

export const BarContainer = styled.div`
  background: #2a2a3a;
  border-radius: 10px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 8px;
`;

export const BarFill = styled.div`
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
`;

export const Limits = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #6b7280;
  margin-top: 4px;
`;

// ---------- Circular: inner content (linear layout, round container) ----------

export const CircularIcon = styled.div<{ size?: "small" | "medium" | "large" }>`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: ${({ size }) =>
    size === "small" ? "14px" : size === "large" ? "22px" : "18px"};
  line-height: 1;
  z-index: 1;
`;

export const CircularLabel = styled.div<{
  size?: "small" | "medium" | "large";
}>`
  position: relative;
  z-index: 1;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: ${({ size }) =>
    size === "small" ? "10px" : size === "large" ? "14px" : "12px"};
  line-height: 1;
`;

export const CircularValueRow = styled.div`
  position: relative;
  z-index: 1;
  font-weight: 700;
  color: #e5e7eb;
  line-height: 1.2;
`;

export const CircularValueNum = styled.span<{
  size?: "small" | "medium" | "large";
}>`
  font-family: monospace;
  font-size: ${({ size }) =>
    size === "small" ? "16px" : size === "large" ? "28px" : "22px"};
`;

export const CircularUnit = styled.span`
  font-size: 0.5em;
  margin-left: 2px;
  color: #9ca3af;
  font-weight: 400;
`;

export const CircularMin = styled.div`
  position: absolute;
  z-index: 1;
  left: 18%;
  top: 73.5%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  color: #6b7280;
  font-family: monospace;
  line-height: 1;
`;

export const CircularMax = styled.div`
  position: absolute;
  z-index: 1;
  left: 82%;
  top: 73.5%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  color: #6b7280;
  font-family: monospace;
  line-height: 1;
`;
