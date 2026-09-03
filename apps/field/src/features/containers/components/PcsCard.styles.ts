// apps/field/src/features/containers/components/PcsCard.styles.ts
import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Card = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

export const Name = styled.span`
  font-weight: 700;
  color: ${COLORS.textPrimary};
  font-size: 14px;
  letter-spacing: 0.5px;
`;

export const ContainerName = styled.span`
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const Badges = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`;

export const Badge = styled.span<{ color: string; alpha: string }>`
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: ${(props) => props.alpha};
  color: ${(props) => props.color};
  border: 1px solid ${(props) => props.color};
`;

export const MainMetric = styled.div`
  text-align: center;
  margin-bottom: 12px;
  padding: 12px;
  background: ${COLORS.bgInput};
  border-radius: 12px;
`;

export const MainValue = styled.div<{ color: string }>`
  font-size: 30px;
  font-weight: 800;
  color: ${(props) => props.color};
  line-height: 1;
  margin-bottom: 6px;
`;

export const MainLabel = styled.div`
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 6px;
`;

export const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.bgInput};
  padding: 6px 8px;
  border-radius: 10px;
`;

export const DetailLabel = styled.span`
  font-size: 10px;
  color: ${COLORS.textMuted};
  flex: 1;
`;

export const DetailValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

export const ActionButton = styled.button`
  flex: 1;
  padding: 8px 0;
  background: ${COLORS.bgPopup};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  color: ${COLORS.textLight};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  &:hover {
    background: ${COLORS.bgSkeleton};
    border-color: ${COLORS.info};
    color: ${COLORS.info};
  }
`;
