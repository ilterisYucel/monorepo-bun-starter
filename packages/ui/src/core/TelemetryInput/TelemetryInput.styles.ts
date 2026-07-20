// packages/ui/src/core/TelemetryInput/TelemetryInput.styles.ts
import styled from "@emotion/styled";
import { COLORS } from "../../colors";

const statusColors = {
  nominal: COLORS.success,
  warning: COLORS.warning,
  alarm: COLORS.error,
} as const;

type StatusKey = keyof typeof statusColors;

export const Container = styled.div<{
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  $status?: StatusKey;
}>`
  background: ${COLORS.bgCard};
  border: 1px solid ${(props) => (props.disabled ? COLORS.borderDefault : COLORS.borderLight)};
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
      border-color: ${COLORS.info};
      background: ${COLORS.bgPopup};
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
  color: ${COLORS.textPrimary};
`;

export const DeviceId = styled.span`
  font-size: 12px;
  color: ${COLORS.textVoltage};
  background: linear-gradient(135deg, ${COLORS.gradDeviceIdStart} 0%, ${COLORS.gradDeviceIdEnd} 100%);
  padding: 3px 12px;
  border-radius: 20px;
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.3px;
  border: 1px solid ${COLORS.infoAlpha25};
  box-shadow: 0 0 8px ${COLORS.infoAlpha8};
`;

export const TagsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

export const Tag = styled.span`
  font-size: 11px;
  background: ${COLORS.bgTag};
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid ${COLORS.borderLight};
  font-family: monospace;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.textDisabled};
    background: ${COLORS.bgCard};
  }
`;

export const TagKey = styled.span`
  color: ${COLORS.textPurple};
  font-weight: 600;
`;

export const TagValue = styled.span`
  color: ${COLORS.textTagGray};
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
  min-width: 0;
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 0;
  padding: 8px 16px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${({ $status }) =>
      $status ? statusColors[$status] : COLORS.info};
    box-shadow: ${({ $status }) =>
      $status
        ? `0 0 0 2px ${statusColors[$status]}20`
        : `0 0 0 2px ${COLORS.infoAlpha12}`};
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
  min-width: 0;
  background: transparent;
  border: none;
  color: ${({ $status }) =>
    $status ? statusColors[$status] : COLORS.textPrimary};
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
  color: ${COLORS.textMuted};
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
  flex-shrink: 0;
  margin-left: auto;
`;

export const ControlBtn = styled.button`
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${COLORS.textMuted};
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
  background: ${COLORS.borderDefault};
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
    $status ? statusColors[$status] : COLORS.info};
  transition: width 0.3s ease, background 0.2s ease;
`;

export const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: ${COLORS.textDisabled};
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
  color: ${COLORS.textPrimary};
  line-height: 1.4;
  text-align: left;
`;

export const LimitIndicator = styled.div`
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: ${COLORS.textMuted};
  font-family: monospace;
  margin-left: auto; // 🔥 her zaman sağda
`;

export const LimitBadge = styled.span<{ isMin?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;
