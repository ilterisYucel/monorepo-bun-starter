// packages/ui/src/core/Gauge/Gauge.styles.ts
import styled from "@emotion/styled";

export const GaugeContainer = styled.div<{
  size?: "small" | "medium" | "large";
}>`
  box-sizing: border-box;
  border-radius: 16px;
  transition: all 0.2s ease;
  border: 1px solid #2a2a3a;
  cursor: pointer;
  text-align: center;
  background: #1a1a2e;

  padding: ${(props) =>
    props.size === "small" ? "12px" : props.size === "large" ? "24px" : "16px"};
  min-width: ${(props) =>
    props.size === "small"
      ? "100px"
      : props.size === "large"
        ? "180px"
        : "140px"};

  &:hover {
    transform: translateY(-2px);
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

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
