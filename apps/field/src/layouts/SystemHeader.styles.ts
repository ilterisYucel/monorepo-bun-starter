import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Bar = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 14px;
  background: ${COLORS.bgSystemBar};
  border-bottom: 1px solid ${COLORS.borderDefault};
  flex-shrink: 0;
  min-height: 40px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  width: 100%;
`;

export const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Label = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textLight};
`;

export const Mono = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textPrimary};
  font-variant-numeric: tabular-nums;
  font-family: var(--mono, monospace);
`;
