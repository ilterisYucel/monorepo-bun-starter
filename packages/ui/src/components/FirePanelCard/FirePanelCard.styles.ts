import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Card = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    border-color: ${COLORS.info};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;

export const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; flex-wrap: wrap; gap: 6px;
`;

export const Name = styled.span`
  font-weight: 700; color: ${COLORS.textPrimary}; font-size: 16px; letter-spacing: 0.5px;
`;

export const Badges = styled.div`display: flex; gap: 6px;`;

const badgeBase = styled.span`
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 4px;
`;

export const BadgeOk = styled(badgeBase)`
  background: ${COLORS.successAlpha12}; color: ${COLORS.success}; border: 1px solid ${COLORS.success};
`;

export const BadgeAlarm = styled(badgeBase)`
  background: ${COLORS.errorAlpha12}; color: ${COLORS.error}; border: 1px solid ${COLORS.error};
`;

export const BadgeFault = styled(badgeBase)`
  background: ${COLORS.warningAlpha12}; color: ${COLORS.warning}; border: 1px solid ${COLORS.warning};
`;

export const StatusRow = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;
`;

export const StatusCard = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  padding: 12px 8px; border-radius: 10px; text-align: center;
  border: 2px solid ${({ $variant }) => $variant === "ok" ? COLORS.success : $variant === "alarm" ? COLORS.error : COLORS.warning};
  background: ${({ $variant }) => $variant === "ok" ? COLORS.successAlpha12 : $variant === "alarm" ? COLORS.errorAlpha12 : COLORS.warningAlpha12};
`;

export const StatusValue = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  font-size: 18px; font-weight: 800;
  color: ${({ $variant }) => $variant === "ok" ? COLORS.success : $variant === "alarm" ? COLORS.error : COLORS.warning};
`;

export const StatusLabel = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  font-size: 10px; font-weight: 600;
  color: ${({ $variant }) => $variant === "ok" ? COLORS.success : $variant === "alarm" ? COLORS.error : COLORS.warning};
`;

export const RelayGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 4px;
`;

export const RelayItem = styled.div`
  display: flex; align-items: center; gap: 8px;
  background: ${COLORS.bgInput}; padding: 6px 10px; border-radius: 8px;
`;

export const RelayDot = styled.span<{ $active: boolean; $inverted?: boolean }>`
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $active, $inverted }) =>
    $inverted ? ($active ? COLORS.success : COLORS.error) : ($active ? COLORS.error : COLORS.success)};
`;

export const RelayLabel = styled.span`
  font-size: 11px; color: ${COLORS.textMuted}; flex: 1;
`;

export const RelayValue = styled.span<{ $active: boolean }>`
  font-size: 11px; font-weight: 600;
  color: ${({ $active }) => ($active ? COLORS.error : COLORS.success)};
`;

export const DetailButton = styled.button`
  margin-top: 12px; width: 100%; padding: 10px 0;
  background: ${COLORS.bgPopup}; border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px; color: ${COLORS.textLight};
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.bgSkeleton}; border-color: ${COLORS.info}; color: ${COLORS.info};
  }
`;
