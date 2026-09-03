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
`;

export const ModalContainer = styled.div<{ width?: number }>`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;
  width: min(${(props) => props.width ?? 900}px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const Title = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${COLORS.textPrimary};
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textPrimary};
  }
`;

export const Body = styled.div`
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
`;
