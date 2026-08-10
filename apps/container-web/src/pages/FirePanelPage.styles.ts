import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Container = styled.div`
  padding: 20px 24px;
  color: ${COLORS.textPrimary};
`;

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: ${COLORS.textWhite};
`;

export const TopCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
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

export const RelayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
`;

export const RelayRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: ${COLORS.bgInput};
  border-radius: 8px;
`;

export const RelayDot = styled.span<{ $active: boolean; $inverted?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $active, $inverted }) =>
    $inverted
      ? $active
        ? COLORS.success
        : COLORS.error
      : $active
        ? COLORS.error
        : COLORS.success};
`;

export const RelayLabel = styled.span`
  font-size: 12px;
  color: ${COLORS.textLight};
  flex: 1;
`;

export const RelayValue = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? COLORS.error : COLORS.success)};
`;

export const Loading = styled.div`
  text-align: center;
  padding: 60px;
  color: ${COLORS.textDisabled};
  font-size: 14px;
`;
