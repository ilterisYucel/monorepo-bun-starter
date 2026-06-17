// packages/ui/src/core/TelemetryInput/TelemetryInput.styles.ts
import styled from "@emotion/styled";

const statusColors = {
  nominal: "#10b981",
  warning: "#f59e0b",
  alarm: "#ef4444",
} as const;

type StatusKey = keyof typeof statusColors;

export const Container = styled.div<{
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  $status?: StatusKey;
}>`
  background: #1a1a2e;
  border: 1px solid ${(props) => (props.disabled ? "#2a2a3a" : "#3a3a4a")};
  border-radius: 12px;
  transition: all 0.2s ease;
  width: 100%;
  padding: ${(props) =>
    props.size === "small" ? "12px" : props.size === "large" ? "20px" : "16px"};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "default")};
  box-sizing: border-box;

  ${({ $status }) =>
    $status
      ? `border-left: 3px solid ${statusColors[$status]};`
      : ""}

  ${(props) =>
    !props.disabled && !props.$status
      ? `
    &:hover {
      border-color: #3b82f6;
      background: #1f1f2e;
    }
  ` : ""}
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0px 8px;
`;

export const LabelSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const Name = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
`;

export const DeviceId = styled.span`
  font-size: 12px;
  color: #93c5fd;
  background: linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%);
  padding: 3px 12px;
  border-radius: 20px;
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.3px;
  border: 1px solid #3b82f640;
  box-shadow: 0 0 8px #3b82f618;
`;

export const TagsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

export const Tag = styled.span`
  font-size: 11px;
  background: #141420;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #3a3a4a;
  font-family: monospace;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6b7280;
    background: #1a1a2e;
  }
`;

export const TagKey = styled.span`
  color: #a78bfa;
  font-weight: 600;
`;

export const TagValue = styled.span`
  color: #94a3b8;
`;

// ---------- Status göstergesi ----------

export const StatusDot = styled.span<{ $status: StatusKey }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $status }) => statusColors[$status]};
  box-shadow: 0 0 6px ${({ $status }) => statusColors[$status]}40;
  flex-shrink: 0;
`;

// 🔥 Input Group - tek bg rengi, içindeki her şey aynı renkte
export const InputGroup = styled.div<{ $status?: StatusKey }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a3a;
  border-radius: 0;
  padding: 8px 16px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ $status }) =>
      $status ? statusColors[$status] : "#3b82f6"};
    box-shadow: ${({ $status }) =>
      $status
        ? `0 0 0 2px ${statusColors[$status]}20`
        : "0 0 0 2px #3b82f620"};
  }
`;

// Sol kısım: Input + Unit (sola yaslı)
export const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const ValueInput = styled.input<{ $status?: StatusKey }>`
  flex: 1;
  background: transparent;
  border: none;
  color: ${({ $status }) =>
    $status ? statusColors[$status] : "#e5e7eb"};
  font-family: monospace;
  font-size: 20px;
  font-weight: 500;
  text-align: left;
  outline: none;

  &:focus {
    outline: none;
  }
`;

export const Unit = styled.span`
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
`;

// Sağ kısım: Ok tuşları (sağa yaslı)
export const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
`;

export const ControlBtn = styled.button`
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  font-size: 14px;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.9);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// ---------- Aralık barı ----------

export const RangeContainer = styled.div`
  margin-bottom: 8px;
`;

export const RangeBar = styled.div`
  height: 4px;
  background: #2a2a3a;
  border-radius: 2px;
  overflow: hidden;
`;

export const RangeBarFill = styled.div<{
  $percentage: number;
  $status?: StatusKey;
}>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  border-radius: 2px;
  background: ${({ $status }) =>
    $status ? statusColors[$status] : "#3b82f6"};
  transition: width 0.3s ease, background 0.2s ease;
`;

export const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #6b7280;
  font-family: monospace;
  margin-top: 4px;
`;

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 8px;
  min-height: 20px; // 🔥 description olmasa bile yükseklik korunsun
`;

export const Description = styled.div`
  font-size: 11px;
  color: #e5e7eb;
  line-height: 1.4;
  text-align: left;
`;

export const LimitIndicator = styled.div`
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #9ca3af;
  font-family: monospace;
  margin-left: auto; // 🔥 her zaman sağda
`;

export const LimitBadge = styled.span<{ isMin?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;
