import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${COLORS.bgApp};
`;

export const SidebarWrapper = styled.aside<{ $collapsed: boolean }>`
  width: ${({ $collapsed }) => ($collapsed ? "70px" : "260px")};
  min-width: ${({ $collapsed }) => ($collapsed ? "70px" : "260px")};
  background: linear-gradient(180deg, ${COLORS.bgApp} 0%, ${COLORS.bgCard} 100%);
  border-right: 1px solid ${COLORS.borderDefault};
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-x: hidden;
`;

export const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Content = styled.main`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

export const SidebarLogo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  margin-top: 8px;
  ${({ $collapsed }) =>
    $collapsed &&
    `
    justify-content: center;
    padding: 24px 0;
  `}
`;

export const LogoIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: ${COLORS.info};
`;

export const LogoText = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
  white-space: nowrap;
`;

export const SidebarSection = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const SidebarTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

export const SidebarNav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 12px;
`;

export const NavItem = styled.button<{ $active: boolean; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ $collapsed }) => ($collapsed ? "12px" : "12px 16px")};
  background: ${({ $active }) => ($active ? COLORS.info : "transparent")};
  border: none;
  border-radius: 10px;
  color: ${({ $active }) => ($active ? "white" : COLORS.textMuted)};
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};

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

export const NavLabel = styled.span`
  white-space: nowrap;
`;

export const ContainerItem = styled.button<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 16px;
  background: transparent;
  border: none;
  color: ${({ $connected }) => ($connected ? COLORS.textPrimary : COLORS.textMuted)};
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: ${COLORS.textWhite};
  }
`;

export const ConnectionDot = styled.span<{ $connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $connected }) => ($connected ? COLORS.success : COLORS.error)};
  flex-shrink: 0;
`;

export const ToggleSeparator = styled.div`
  height: 1px;
  background: ${COLORS.borderDefault};
  margin: 0 16px;
`;

export const ToggleContainer = styled.div<{ $collapsed: boolean }>`
  display: flex;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-end")};
  padding: 12px 16px;
`;

export const SidebarToggle = styled.button<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textMuted};
  cursor: pointer;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
    border-color: ${COLORS.info};
  }

  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.3s ease;
    transform: ${({ $collapsed }) => ($collapsed ? "rotate(0deg)" : "rotate(180deg)")};
  }
`;

export const ToggleLabel = styled.span`
  white-space: nowrap;
`;

export const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid ${COLORS.borderDefault};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const EmergencyStopBtn = styled.button<{ $collapsed: boolean }>`
  background: ${COLORS.error};
  border: none;
  color: white;
  padding: ${({ $collapsed }) => ($collapsed ? "10px" : "10px")};
  border-radius: 8px;
  font-weight: 700;
  font-size: ${({ $collapsed }) => ($collapsed ? "16px" : "14px")};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${COLORS.errorHover};
    transform: scale(1.02);
  }
`;

export const UserProfileDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${COLORS.textPrimary};
`;

export const UserProfileAvatar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: ${COLORS.textMuted};
`;

export const UserProfileName = styled.span`
  color: ${COLORS.textPrimary};
  font-size: 13px;
  font-weight: 500;
`;

export const UserRoleBadge = styled.span<{ $role: "admin" | "teknik" | "boss" }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ $role }) =>
    $role === "admin" ? COLORS.infoAlpha12 : $role === "boss" ? COLORS.successAlpha12 : COLORS.warningAlpha12};
  color: ${({ $role }) =>
    $role === "admin" ? COLORS.info : $role === "boss" ? COLORS.success : COLORS.warning};
`;

export const LogoutBtn = styled.button<{ $collapsed: boolean }>`
  padding: ${({ $collapsed }) => ($collapsed ? "10px" : "8px 12px")};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid ${COLORS.borderDefault};
  background: transparent;
  color: ${COLORS.textMuted};
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;

  &:hover {
    border-color: ${COLORS.errorStroke};
    color: ${COLORS.error};
  }
`;

export const LogoutText = styled.span`
  white-space: nowrap;
`;
