import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Container = styled.div`
  padding: 24px;
  color: ${COLORS.textPrimary};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${COLORS.textWhite};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: ${COLORS.bgCard};
  border-radius: 12px;
  overflow: hidden;
`;

export const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textMuted};
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const Td = styled.td`
  padding: 10px 16px;
  border-bottom: 1px solid ${COLORS.bgPopup};
  color: ${COLORS.textLight};
`;

export const DeviceId = styled.code`
  font-family: var(--mono);
`;

export const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${COLORS.infoAlpha12};
  color: ${COLORS.info};
`;

export const StatusBadge = styled.span<{ $online: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $online }) => ($online ? COLORS.successAlpha12 : COLORS.errorAlpha12)};
  color: ${({ $online }) => ($online ? COLORS.success : COLORS.error)};
`;

export const Loading = styled.div`
  text-align: center;
  padding: 60px;
  color: ${COLORS.textDisabled};
  font-size: 14px;
`;
