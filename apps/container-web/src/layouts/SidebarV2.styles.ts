import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const SidebarContainer = styled.div`
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
  overflow-y: hidden;
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

export const UserProfileContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

export const UserAvatarBtn = styled.button`
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  padding: 4px;
  border-radius: 8px;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textPrimary};
  }
`;

export const UserProfilePopup = styled.div`
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: ${COLORS.bgPopup};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  padding: 12px 16px;
  white-space: nowrap;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const UserProfileName = styled.span`
  color: ${COLORS.textPrimary};
  font-size: 13px;
  font-weight: 500;
`;

export const UserRoleBadge = styled.span<{ role: string }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ role }) =>
    role === "admin" ? COLORS.infoAlpha12 : role === "teknik" ? COLORS.successAlpha12 : COLORS.idleAlpha12};
  color: ${({ role }) =>
    role === "admin" ? COLORS.info : role === "teknik" ? COLORS.success : COLORS.textMuted};
  display: inline-block;
  width: fit-content;
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

export const LoginButton = styled.button`
  background: ${COLORS.info};
  border: none;
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  width: 48px;
  height: 48px;

  &:hover {
    background: ${COLORS.infoHover};
  }
`;
