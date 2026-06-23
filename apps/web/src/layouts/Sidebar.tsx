import React, { useState } from "react";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import { LogoutButton } from "../features/auth";
import { useAuth } from "../features/auth/hooks/useAuth";
import * as S from "./Sidebar.styles";

export type PageType =
  | "dashboard"
  | "racks"
  | "control"
  | "events"
  | "system-charts"
  | "reports";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { id: "dashboard" as const, label: "Panel", icon: SCADA_ICONS.dashboard },
  { id: "racks" as const, label: "Rack Detayları", icon: SCADA_ICONS.battery },
  { id: "control" as const, label: "Kontrol", icon: SCADA_ICONS.control },
  {
    id: "system-charts" as const,
    label: "Analitik",
    icon: SCADA_ICONS.charts,
  },
  { id: "reports" as const, label: "Raporlar", icon: SCADA_ICONS.reports },
  { id: "events" as const, label: "Olay & Geçmiş", icon: SCADA_ICONS.events },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, isAdmin } = useAuth();
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const handleEmergencyStop = () => {
    if (
      confirm("ACİL DURDURMA: Tüm sistem duracak. Devam etmek istiyor musunuz?")
    ) {
      console.log("Emergency stop triggered");
    }
  };

  const LogoIcon = SCADA_ICONS.logo;
  const CollapseIcon = SCADA_ICONS.collapse;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;

  return (
    <S.SidebarContainer collapsed={collapsed}>
      <S.SidebarLogo collapsed={collapsed}>
        <S.LogoIcon>
          <LogoIcon size={28} />
        </S.LogoIcon>
        {!collapsed && <S.LogoText>CCC</S.LogoText>}
      </S.SidebarLogo>

      <S.SidebarNav>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <S.NavItem
              key={item.id}
              active={currentPage === item.id}
              collapsed={collapsed}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <S.NavIcon>
                <Icon size={20} />
              </S.NavIcon>
              {!collapsed && <S.NavLabel>{item.label}</S.NavLabel>}
            </S.NavItem>
          );
        })}
      </S.SidebarNav>

      <S.ToggleSeparator />
      <S.ToggleContainer collapsed={collapsed}>
        <S.SidebarToggle
          collapsed={collapsed}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          <CollapseIcon size={14} />
          {!collapsed && <S.ToggleLabel>Daralt</S.ToggleLabel>}
        </S.SidebarToggle>
      </S.ToggleContainer>

      <S.SidebarFooter>
        <S.UserProfileContainer
          collapsed={collapsed}
          onMouseEnter={() => setShowProfilePopup(true)}
          onMouseLeave={() => setShowProfilePopup(false)}
        >
          {collapsed ? (
            <>
              <S.UserProfileAvatar>
                <UserIcon size={20} />
              </S.UserProfileAvatar>
              {showProfilePopup && (
                <S.UserProfilePopup>
                  <S.UserProfileName>
                    {user?.name ?? "Kullanıcı"}
                  </S.UserProfileName>
                  <S.UserRoleBadge role={isAdmin ? "admin" : "teknik"}>
                    {isAdmin ? "Admin" : "Teknik"}
                  </S.UserRoleBadge>
                </S.UserProfilePopup>
              )}
            </>
          ) : (
            <S.UserProfileDetails>
              <S.UserProfileAvatar>
                <UserIcon size={20} />
              </S.UserProfileAvatar>
              <S.UserProfileName>{user?.name}</S.UserProfileName>
              <S.UserRoleBadge role={isAdmin ? "admin" : "teknik"}>
                {isAdmin ? "Admin" : "Teknik"}
              </S.UserRoleBadge>
            </S.UserProfileDetails>
          )}
        </S.UserProfileContainer>

        <S.EmergencyStopBtn
          collapsed={collapsed}
          onClick={handleEmergencyStop}
          title={collapsed ? "ACİL DURDUR" : undefined}
        >
          <EmergencyIcon size={collapsed ? 18 : 16} />
          {!collapsed && " ACİL DURDUR"}
        </S.EmergencyStopBtn>

        <LogoutButton collapsed={collapsed} />
      </S.SidebarFooter>
    </S.SidebarContainer>
  );
};
