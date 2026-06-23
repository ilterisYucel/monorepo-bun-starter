import styled from "@emotion/styled";

export const SidebarContainer = styled.div<{ collapsed: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ collapsed }) => (collapsed ? "70px" : "260px")};
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
  border-right: 1px solid #2a2a3a;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 100;
  overflow-x: hidden;
`;

export const SidebarLogo = styled.div<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border-bottom: 1px solid #2a2a3a;
  margin-top: 8px;
  ${({ collapsed }) =>
    collapsed &&
    `
    justify-content: center;
    padding: 24px 0;
  `}
`;

export const LogoIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #3b82f6;
`;

export const LogoText = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: #e5e7eb;
  white-space: nowrap;
`;

export const SidebarNav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 12px;
`;

export const NavItem = styled.button<{ active: boolean; collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ collapsed }) => (collapsed ? "12px" : "12px 16px")};
  background: ${({ active }) => (active ? "#3b82f6" : "transparent")};
  border: none;
  border-radius: 10px;
  color: ${({ active }) => (active ? "white" : "#9ca3af")};
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
  justify-content: ${({ collapsed }) =>
    collapsed ? "center" : "flex-start"};

  &:hover {
    background: ${({ active }) => (active ? "#3b82f6" : "#2a2a3a")};
    color: #e5e7eb;
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

export const ToggleSeparator = styled.div`
  height: 1px;
  background: #2a2a3a;
  margin: 0 16px;
`;

export const ToggleContainer = styled.div<{ collapsed: boolean }>`
  display: flex;
  justify-content: ${({ collapsed }) => (collapsed ? "center" : "flex-end")};
  padding: 12px 16px;
`;

export const SidebarToggle = styled.button<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px solid #2a2a3a;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: #2a2a3a;
    color: #e5e7eb;
    border-color: #3b82f6;
  }

  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.3s ease;
    transform: ${({ collapsed }) =>
      collapsed ? "rotate(0deg)" : "rotate(180deg)"};
  }
`;

export const ToggleLabel = styled.span`
  white-space: nowrap;
`;

export const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid #2a2a3a;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const EmergencyStopBtn = styled.button<{ collapsed: boolean }>`
  background: #ef4444;
  border: none;
  color: white;
  padding: ${({ collapsed }) => (collapsed ? "10px" : "10px")};
  border-radius: 8px;
  font-weight: 700;
  font-size: ${({ collapsed }) => (collapsed ? "16px" : "14px")};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #dc2626;
    transform: scale(1.02);
  }
`;

export const UserProfileContainer = styled.div<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ collapsed }) =>
    collapsed ? "center" : "space-between"};
  padding: ${({ collapsed }) => (collapsed ? "4px" : "0")};
  position: relative;
`;

export const UserProfileAvatar = styled.div`
  cursor: default;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #9ca3af;
`;

export const UserProfileDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e5e7eb;
`;

export const UserProfileName = styled.span`
  color: #e5e7eb;
  font-size: 13px;
  font-weight: 500;
`;

export const UserRoleBadge = styled.span<{ role: "admin" | "teknik" | "guest" }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ role }) =>
    role === "admin" ? "#3b82f620" : role === "teknik" ? "#10b98120" : "#6b728020"};
  color: ${({ role }) =>
    role === "admin" ? "#3b82f6" : role === "teknik" ? "#10b981" : "#9ca3af"};
`;

export const UserProfilePopup = styled.div`
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: #1f1f2e;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  padding: 12px 16px;
  white-space: nowrap;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: none;

  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const LoginButton = styled.button<{ collapsed: boolean }>`
  background: #3b82f6;
  border: none;
  color: white;
  padding: ${({ collapsed }) => (collapsed ? "10px" : "10px 16px")};
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background: #2563eb;
  }
`;
