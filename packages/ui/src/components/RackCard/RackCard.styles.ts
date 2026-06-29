// packages/ui/src/components/RackCard/RackCard.styles.ts
import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Card = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 20px;
  padding: 20px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  @media (max-width: 480px) {
    padding: 16px;
  }

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
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`;

export const Name = styled.span`
  font-weight: 700;
  color: ${COLORS.textPrimary};
  font-size: 18px;
  letter-spacing: 0.5px;
`;

export const Badges = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`;

export const BadgeOnline = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.success};
`;

export const BadgeOffline = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.errorAlpha12};
  color: ${COLORS.error};
  border: 1px solid ${COLORS.error};
`;

export const BadgeCharge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.successAlpha12};
  color: ${COLORS.success};
  border: 1px solid ${COLORS.success};
`;

export const BadgeDischarge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.warningAlpha12};
  color: ${COLORS.warning};
  border: 1px solid ${COLORS.warning};
`;

export const BadgeIdle = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.idleAlpha12};
  color: ${COLORS.textMuted};
  border: 1px solid ${COLORS.textDisabled};
`;

export const SocContainer = styled.div`
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: ${COLORS.bgInput};
  border-radius: 16px;
`;

export const SocValue = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: ${COLORS.info};
  line-height: 1;
  margin-bottom: 8px;

  @media (max-width: 480px) {
    font-size: 36px;
  }
`;

export const SocLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.textMuted};
  margin-bottom: 12px;
`;

export const SocBar = styled.div`
  height: 8px;
  background: ${COLORS.borderDefault};
  border-radius: 4px;
  overflow: hidden;
`;

export const SocBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${COLORS.info}, ${COLORS.success});
  border-radius: 4px;
  transition: width 0.3s ease;
`;

export const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${COLORS.bgInput};
  padding: 10px 12px;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.bgPopup};
    transform: translateX(2px);
  }
`;

export const DetailIcon = styled.span`
  font-size: 16px;
  min-width: 28px;
`;

export const DetailLabel = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const DetailValue = styled.span`
  font-size: 13px;
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
