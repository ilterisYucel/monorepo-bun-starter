import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Page = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const FilterPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: ${COLORS.bgPanel};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 12px;
`;

export const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  padding: 8px 12px;
  background: ${COLORS.bgInput};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  color: ${COLORS.textPrimary};
  font-size: 13px;
  font-family: inherit;

  &::placeholder {
    color: ${COLORS.textDisabled};
  }
`;

export const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.button<{ $active: boolean; $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  background: ${({ $active }) => ($active ? COLORS.infoAlpha12 : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? COLORS.info : COLORS.borderDefault)};
  border-radius: 999px;
  color: ${({ $active, $muted }) =>
    $muted ? COLORS.textDisabled : $active ? COLORS.textWhite : COLORS.textMuted};
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;

  &:hover {
    border-color: ${COLORS.info};
  }
`;

export const ChipGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const MuteButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textMuted};
  cursor: pointer;
  font-size: 10px;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textWhite};
  }
`;
