import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { COLORS } from "../../colors";

type Status = "online" | "warning" | "offline";

const statusColor = (status: Status): string =>
  status === "online" ? COLORS.success : status === "warning" ? COLORS.warning : COLORS.error;

const statusGlow = (status: Status): string =>
  status === "online"
    ? COLORS.successAlpha25
    : status === "warning"
      ? COLORS.warningAlpha25
      : COLORS.errorAlpha25;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 ${COLORS.successAlpha25}; }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

export const Card = styled.button<{ $size: "small" | "medium"; $status: Status }>`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: ${({ $size }) => ($size === "small" ? "8px" : "10px")};
  padding: ${({ $size }) => ($size === "small" ? "14px 14px 12px" : "16px")};
  background: linear-gradient(180deg, ${COLORS.gradPanelTop}, ${COLORS.bgCard});
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $status }) => statusColor($status)};
    box-shadow: 0 10px 28px ${({ $status }) => statusGlow($status)};
  }

  &:active {
    transform: translateY(0);
  }
`;

export const AccentStrip = styled.span<{ $status: Status }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    ${({ $status }) => statusColor($status)},
    transparent 85%
  );
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

export const StatusDot = styled.span<{ $status: Status }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) => statusColor($status)};
  box-shadow: 0 0 8px ${({ $status }) => statusGlow($status)};
  ${({ $status }) =>
    $status === "online" && css`
      animation: ${pulse} 2s ease-out infinite;
    `}
`;

export const Name = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: ${COLORS.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StatusPill = styled.span<{ $status: Status }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $status }) => statusColor($status)};
  background: ${({ $status }) => statusGlow($status)};
`;

export const Body = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const SocBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

export const SocRing = styled.div<{ $percent: number }>`
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(
    ${COLORS.success} ${({ $percent }) => $percent * 3.6}deg,
    ${COLORS.bgPanel} ${({ $percent }) => $percent * 3.6}deg
  );

  &::before {
    content: "";
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background: ${COLORS.bgCard};
  }
`;

export const SocRingCenter = styled.span`
  position: relative;
  font-size: 13px;
  font-weight: 800;
  color: ${COLORS.textWhite};
  font-variant-numeric: tabular-nums;
`;

export const SocCaption = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const Metrics = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
`;

export const MetricRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const MetricIcon = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${COLORS.textMuted};
`;

export const MetricLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const MetricValue = styled.span<{ $ok?: boolean; $alarm?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $alarm, $ok }) =>
    $alarm ? COLORS.error : $ok === true ? COLORS.success : COLORS.textPrimary};
  white-space: nowrap;
`;
