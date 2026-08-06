import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${COLORS.overlayBg};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

export const Modal = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;
  width: 100%;
  max-width: 98vw;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const DeviceName = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${COLORS.textWhite};
`;

export const DeviceId = styled.code`
  font-size: 12px;
  color: ${COLORS.textMuted};
  background: ${COLORS.bgInput};
  padding: 2px 8px;
  border-radius: 6px;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${COLORS.textMuted};
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;

  &:hover {
    color: ${COLORS.textWhite};
    background: ${COLORS.bgHover};
  }
`;

export const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${COLORS.borderDefault};
  padding: 0 24px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? COLORS.info : "transparent")};
  color: ${({ $active }) => ($active ? COLORS.textWhite : COLORS.textMuted)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: ${COLORS.textWhite};
  }
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

export const InfoField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: ${COLORS.bgInput};
  padding: 10px 14px;
  border-radius: 10px;
`;

export const InfoLabel = styled.span`
  font-size: 10px;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const InfoValue = styled.span`
  font-size: 13px;
  color: ${COLORS.textPrimary};
  font-weight: 600;
`;

export const ConfigTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
`;

export const Th = styled.th`
  text-align: left;
  padding: 6px 7px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textMuted};
  font-weight: 600;
  font-size: 9px;
  text-transform: uppercase;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: ${COLORS.bgCard};
  z-index: 1;
`;

export const Td = styled.td`
  padding: 4px 7px;
  border-bottom: 1px solid ${COLORS.bgPopup};
  color: ${COLORS.textLight};
  white-space: nowrap;
`;

export const TagBadge = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  background: ${COLORS.infoAlpha12};
  color: ${COLORS.info};
`;

export const TypeBadge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  background: ${({ $type }) =>
    $type === "INPUT_REGISTER"
      ? COLORS.successAlpha12
      : $type === "HOLDING_REGISTER"
        ? COLORS.warningAlpha12
        : $type === "COIL"
          ? COLORS.errorAlpha12
          : COLORS.idleAlpha12};
  color: ${({ $type }) =>
    $type === "INPUT_REGISTER"
      ? COLORS.success
      : $type === "HOLDING_REGISTER"
        ? COLORS.warning
        : $type === "COIL"
          ? COLORS.error
          : COLORS.idle};
`;

export const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: ${COLORS.textMuted};
  font-size: 14px;
`;

export const Error = styled.div`
  padding: 24px;
  color: ${COLORS.error};
  text-align: center;
  font-size: 14px;
`;
