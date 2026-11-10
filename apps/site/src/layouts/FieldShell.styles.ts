import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${COLORS.bgApp};
`;

export const SidebarWrapper = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: linear-gradient(180deg, ${COLORS.bgApp} 0%, ${COLORS.bgCard} 100%);
  border-right: 1px solid ${COLORS.borderDefault};
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow-x: hidden;
`;

export const MainArea = styled.div`
  flex: 1;
  margin-left: 80px;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Content = styled.main`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

export const SidebarLogo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  border-bottom: 1px solid ${COLORS.borderDefault};
  margin-top: 8px;
`;

export const LogoIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: ${COLORS.info};
`;

export const SidebarNav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 8px;
  overflow: hidden;
`;

export const NavItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  width: 64px;
  min-height: 56px;
  background: ${({ $active }) => ($active ? COLORS.info : "transparent")};
  border: none;
  border-radius: 10px;
  color: ${({ $active }) => ($active ? "white" : COLORS.textMuted)};
  cursor: pointer;
  transition: all 0.2s;
  margin: 0 auto;

  &:hover {
    background: ${({ $active }) => ($active ? COLORS.info : COLORS.borderDefault)};
    color: ${COLORS.textPrimary};
  }
`;

export const NavIcon = styled.span`
  min-width: 28px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const NavLabel = styled.span<{ $active: boolean }>`
  font-size: 10px;
  white-space: nowrap;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $active }) => ($active ? COLORS.textPrimary : COLORS.textMuted)};
  line-height: 1.2;
`;

export const SidebarFooter = styled.div`
  padding: 12px 8px;
  border-top: 1px solid ${COLORS.borderDefault};
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
`;

export const EmergencyStopBtn = styled.button`
  background: ${COLORS.error};
  border: none;
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;

  &:hover {
    background: ${COLORS.errorHover};
    transform: scale(1.02);
  }
`;

export const FooterBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: none;
  border: none;
  border-radius: 8px;
  color: ${COLORS.textMuted};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textLight};
  }
`;

export const UserBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: ${COLORS.textMuted};
`;
