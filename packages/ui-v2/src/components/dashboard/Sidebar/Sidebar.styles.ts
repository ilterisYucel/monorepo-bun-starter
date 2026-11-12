import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";

export const Nav = styled.nav`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 130px;
  height: 100%;
  padding: 14px 8px;
  border-radius: ${RADIUS.lg}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112px;
  padding: 12px 8px;
  margin-bottom: 4px;
`;

export const Logo = styled.img`
  width: 47px;
  height: 48px;
  object-fit: cover;
`;

export const Item = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  width: 112px;
  height: 36px;
  padding: 8px;
  border: none;
  border-radius: ${RADIUS.md}px;
  background: ${({ $active, theme }) => ($active ? theme.colors.successTint : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.textPrimary : theme.colors.textSecondary)};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }
`;

export const ItemIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.successText : theme.colors.textSecondary};
`;

export const Foot = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 112px;
  text-align: center;
`;

export const Version = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 400;
`;

export const Footer = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;
