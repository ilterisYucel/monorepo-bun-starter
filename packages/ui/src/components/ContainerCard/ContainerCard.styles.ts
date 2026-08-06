import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  cursor: pointer;
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

export const SocSection = styled.div`
  padding: 8px 10px;
  background: ${COLORS.bgInput};
  border-radius: 10px;
`;

export const SocHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
`;

export const SocValue = styled.span`
  font-size: 26px;
  font-weight: 800;
  color: ${COLORS.info};
  line-height: 1;
`;

export const SocLabel = styled.span`
  font-size: 10px;
  color: ${COLORS.textMuted};
  align-self: flex-end;
`;

export const SocBar = styled.div`
  height: 5px;
  background: ${COLORS.borderDefault};
  border-radius: 3px;
  overflow: hidden;
`;

export const SocBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: linear-gradient(90deg, ${COLORS.info}, ${COLORS.success});
  border-radius: 3px;
  transition: width 0.3s ease;
`;

export const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`;

export const Metric = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: ${COLORS.bgInput};
  border-radius: 8px;
`;

export const MetricValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.textWhite};
`;

export const MetricLabel = styled.span`
  font-size: 10px;
  color: ${COLORS.textMuted};
  margin-top: 2px;
`;

export const Bottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const DeviceCount = styled.span<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? COLORS.success : COLORS.warning)};
  font-weight: 500;
`;
