import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

/** Haritanın altındaki tek kompozit panel — filtre çipleri + kart grid'i. */
export const Panel = styled.section`
  position: relative;
  overflow: hidden;
  margin: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(180deg, ${COLORS.gradPanelTop}, ${COLORS.bgPanel});
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, ${COLORS.info}, transparent 70%);
  }
`;

export const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

export const Chip = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  background: ${({ $active }) => ($active ? COLORS.infoAlpha12 : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? COLORS.info : COLORS.borderDefault)};
  border-radius: 999px;
  color: ${({ $active }) => ($active ? COLORS.textWhite : COLORS.textMuted)};
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;

  &:hover {
    border-color: ${COLORS.info};
  }
`;

export const ChipDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => $color};
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
`;

/** Grid'in son hücresi — "Saha Ekle" kesikli karosu (tümleşik). */
export const AddTile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 148px;
  background: transparent;
  border: 1.5px dashed ${COLORS.borderDefault};
  border-radius: 14px;
  color: ${COLORS.textMuted};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.info};
    color: ${COLORS.textWhite};
    background: ${COLORS.infoAlpha12};
  }
`;

export const AddTileIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${COLORS.infoDark};
  color: ${COLORS.textWhite};
`;

export const PanelNote = styled.div`
  padding: 8px 0;
  font-size: 13px;
  color: ${COLORS.textMuted};
`;

export const RetryButton = styled.button`
  margin-left: 8px;
  min-height: 28px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  color: ${COLORS.textPrimary};
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
`;
