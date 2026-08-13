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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Name = styled.span`
  font-weight: 700;
  color: ${COLORS.textPrimary};
  font-size: 16px;
  letter-spacing: 0.5px;
`;

export const Badges = styled.div`
  display: flex;
  gap: 6px;
`;

const badgeBase = styled.span`
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const BadgeRunning = styled(badgeBase)`
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.success};
`;

export const BadgeStandby = styled(badgeBase)`
  background: ${COLORS.idleAlpha12};
  color: ${COLORS.textMuted};
  border: 1px solid ${COLORS.textDisabled};
`;

export const BadgeFault = styled(badgeBase)`
  background: ${COLORS.errorAlpha12};
  color: ${COLORS.error};
  border: 1px solid ${COLORS.error};
`;

export const BadgeCooling = styled(badgeBase)`
  background: ${COLORS.tempCold}20;
  color: ${COLORS.tempCold};
  border: 1px solid ${COLORS.tempCold};
`;

export const BadgeWarming = styled(badgeBase)`
  background: ${COLORS.tempHot}20;
  color: ${COLORS.tempHot};
  border: 1px solid ${COLORS.tempHot};
`;

export const BadgeIdle = styled(badgeBase)`
  background: ${COLORS.idleAlpha12};
  color: ${COLORS.textMuted};
  border: 1px solid ${COLORS.textDisabled};
`;

export const TempDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  background: ${COLORS.bgInput};
  border-radius: 14px;
  margin-bottom: 14px;
`;

export const TempValue = styled.div`
  font-size: 42px;
  font-weight: 800;
  color: ${COLORS.info};
  line-height: 1;
`;

export const TempLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.textMuted};
  margin-top: 4px;
`;

export const DataGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 4px;
`;

export const DataItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${COLORS.bgInput};
  padding: 8px 10px;
  border-radius: 8px;
`;

export const DataIcon = styled.span`
  font-size: 15px;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const DataLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const DataValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;

export const DetailButton = styled.button`
  margin-top: 12px;
  width: 100%;
  padding: 10px 0;
  background: ${COLORS.bgPopup};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  color: ${COLORS.textLight};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.bgSkeleton};
    border-color: ${COLORS.info};
    color: ${COLORS.info};
  }
`;

export const AlarmText = styled.span<{ $hasAlarm: boolean }>`
  color: ${({ $hasAlarm }) => ($hasAlarm ? COLORS.warning : COLORS.textMuted)};
  font-weight: ${({ $hasAlarm }) => ($hasAlarm ? 700 : 400)};
`;
