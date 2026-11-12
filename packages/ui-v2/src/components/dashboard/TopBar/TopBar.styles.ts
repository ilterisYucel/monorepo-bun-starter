import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
`;

export const Track = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  height: 42px;
  padding: 4px;
  box-sizing: border-box;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 8px 16px;
  border: none;
  border-radius: ${RADIUS.lg}px;
  background: ${({ $active, theme }) => ($active ? theme.colors.inverse : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.textOnDark : theme.colors.textSecondary)};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }
`;

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
`;

export const Live = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.success};
`;

export const Clock = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.value.fontSize}px;
  line-height: ${COMPACT.value.lineHeight}px;
  font-weight: 500;
`;

export const Emergency = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 7px 12px;
  border: none;
  border-radius: ${RADIUS.md}px;
  background: ${({ theme }) => theme.colors.critical};
  color: ${({ theme }) => theme.colors.textOnSolid};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: 16px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }
`;
