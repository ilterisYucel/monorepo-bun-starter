import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Card = styled.button<{ $size: "small" | "medium" }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $size }) => ($size === "small" ? "4px" : "6px")};
  padding: ${({ $size }) => ($size === "small" ? "10px 12px" : "14px 16px")};
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  cursor: pointer;
  min-height: ${({ $size }) => ($size === "small" ? "72px" : "96px")};
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${COLORS.info};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

export const StatusDot = styled.span<{ $status: "online" | "warning" | "offline" }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) =>
    $status === "online"
      ? COLORS.success
      : $status === "warning"
        ? COLORS.warning
        : COLORS.error};
`;

export const Name = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: ${COLORS.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StatusText = styled.span<{ $status: "online" | "warning" | "offline" }>`
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $status }) =>
    $status === "online"
      ? COLORS.success
      : $status === "warning"
        ? COLORS.warning
        : COLORS.error};
`;

export const Metrics = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

export const MetricRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const MetricIcon = styled.span`
  font-size: 14px;
  min-width: 18px;
  display: inline-flex;
  align-items: center;
`;

export const MetricLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const MetricValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;

export const ContainerCount = styled.span<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? COLORS.success : COLORS.warning)};
  font-weight: 500;
`;

export const AlarmCount = styled.span<{ $hasAlarms: boolean }>`
  font-weight: 600;
  color: ${({ $hasAlarms }) => ($hasAlarms ? COLORS.error : COLORS.textMuted)};
`;
