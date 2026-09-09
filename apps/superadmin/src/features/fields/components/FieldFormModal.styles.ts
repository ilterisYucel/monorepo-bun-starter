import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* leaflet pane'lerinin (z-index ≤ 1000) ÜZERİNDE — modal haritadan alta düşmez. */
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
`;

export const Panel = styled.div`
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.textWhite};
`;

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: ${COLORS.textMuted};
  cursor: pointer;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
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

export const Select = styled.select`
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

export const Row = styled.div`
  display: flex;
  gap: 10px;
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

export const CancelButton = styled.button`
  min-height: 36px;
  padding: 0 14px;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  color: ${COLORS.textMuted};
  cursor: pointer;
  font-family: inherit;
`;

export const SaveButton = styled.button<{ $disabled: boolean }>`
  min-height: 36px;
  padding: 0 14px;
  background: ${COLORS.success};
  border: none;
  border-radius: 10px;
  color: ${COLORS.textWhite};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  font-family: inherit;
`;
