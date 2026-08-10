import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Container = styled.div`
  padding: 20px 24px;
  color: ${COLORS.textPrimary};
`;

export const TopCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

export const StatusCard = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  padding: 18px;
  border-radius: 14px;
  text-align: center;
  border: 2px solid
    ${({ $variant }) =>
      $variant === "ok"
        ? COLORS.success
        : $variant === "alarm"
          ? COLORS.error
          : COLORS.warning};
  background: ${({ $variant }) =>
    $variant === "ok"
      ? COLORS.successAlpha12
      : $variant === "alarm"
        ? COLORS.errorAlpha12
        : COLORS.warningAlpha12};
  transition: all 0.3s ease;
`;

export const CardIcon = styled.div`
  font-size: 32px;
  margin-bottom: 8px;
  color: inherit;
`;

export const CardLabel = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $variant }) =>
    $variant === "ok"
      ? COLORS.success
      : $variant === "alarm"
        ? COLORS.error
        : COLORS.warning};
`;

export const CardValue = styled.div<{ $variant: "ok" | "alarm" | "fault" }>`
  font-size: 22px;
  font-weight: 800;
  color: ${({ $variant }) =>
    $variant === "ok"
      ? COLORS.success
      : $variant === "alarm"
        ? COLORS.error
        : COLORS.warning};
`;

export const PhaseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
`;

export const PhaseCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const PhaseLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${COLORS.info};
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const MetricsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
`;

export const MetricRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: ${COLORS.bgInput};
  border-radius: 8px;
`;

export const MetricLabel = styled.span`
  font-size: 12px;
  color: ${COLORS.textLight};
`;

export const MetricValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${COLORS.textPrimary};
`;

export const Loading = styled.div`
  text-align: center;
  padding: 60px;
  color: ${COLORS.textDisabled};
  font-size: 14px;
`;

export const Empty = styled.div`
  text-align: center;
  padding: 60px;
  color: ${COLORS.textDisabled};
  font-size: 14px;
`;
