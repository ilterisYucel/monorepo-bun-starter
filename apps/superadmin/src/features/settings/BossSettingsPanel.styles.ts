import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Panel = styled.div`
  width: min(460px, calc(100vw - 32px));
  max-height: 80vh;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${COLORS.textWhite};
`;

export const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${COLORS.textWhite};
`;

export const SectionCard = styled.div`
  padding: 14px;
  background: ${COLORS.bgPanel};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ToggleGroup = styled.div`
  display: flex;
  gap: 10px;
`;

export const ToggleBtn = styled.button<{ $active: boolean }>`
  min-height: 40px;
  padding: 0 16px;
  background: ${({ $active }) => ($active ? COLORS.infoDark : "transparent")};
  border: 1px solid
    ${({ $active }) => ($active ? COLORS.infoDark : COLORS.borderDefault)};
  border-radius: 10px;
  color: ${({ $active }) => ($active ? COLORS.textWhite : COLORS.textMuted)};
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;

export const ComingSoon = styled.div`
  font-size: 12px;
  color: COLORS.textMuted;
`;

export const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 12px;
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  color: ${COLORS.textPrimary};
  font-size: 13px;
  font-family: inherit;
`;

export const ActionButton = styled.button`
  min-height: 36px;
  padding: 0 14px;
  background: ${COLORS.infoDark};
  border: none;
  border-radius: 10px;
  color: ${COLORS.textWhite};
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
`;

export const GhostButton = styled.button`
  min-height: 30px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  color: ${COLORS.textMuted};
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
`;

export const HostRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: ${COLORS.bgPanel};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
`;

export const HostInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const HostName = styled.div`
  font-size: 13px;
  color: ${COLORS.textPrimary};
`;

export const HostEndpoint = styled.div`
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const Muted = styled.div`
  font-size: 12px;
  color: ${COLORS.textMuted};
`;
