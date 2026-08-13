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

export const Badges = styled.div`display: flex; gap: 6px;`;

const badgeBase = styled.span`
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 4px;
`;

export const BadgeOnline = styled(badgeBase)`
  background: ${COLORS.successAlpha12}; color: ${COLORS.success}; border: 1px solid ${COLORS.success};
`;

export const TopRow = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;
`;

export const MiniCard = styled.div`
  padding: 12px 8px; border-radius: 10px; text-align: center;
  background: ${COLORS.bgInput}; border: 1px solid ${COLORS.borderDefault};
`;

export const MiniValue = styled.div`
  font-size: 18px; font-weight: 800; color: ${COLORS.info}; padding-bottom: 2px;
`;

export const MiniLabel = styled.div`
  font-size: 10px; color: ${COLORS.textMuted}; font-weight: 600;
`;

export const PhaseRow = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;
`;

export const PhaseBlock = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;

export const PhaseTitle = styled.div`
  font-size: 12px; font-weight: 700; color: ${COLORS.info}; margin-bottom: 4px;
  text-transform: uppercase; letter-spacing: 0.5px;
`;

export const MetricItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: ${COLORS.bgInput};
  padding: 6px 10px;
  border-radius: 8px;
`;

export const MetricLabel = styled.span`
  font-size: 11px; color: ${COLORS.textMuted}; flex: 1;
`;

export const MetricValue = styled.span`
  font-size: 11px; font-weight: 600; color: ${COLORS.textPrimary};
`;

export const BottomGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 4px;
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
