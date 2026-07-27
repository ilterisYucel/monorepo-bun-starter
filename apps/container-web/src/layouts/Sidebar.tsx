import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { LogoutButton } from "../features/auth";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useDevicesStore } from "../stores/devicesStore";
import { controlApi } from "../features/control/services/controlApi";
import { MANEUVERS } from "../features/control/maneuvers";
import * as S from "./Sidebar.styles";

export type PageType =
  | "dashboard"
  | "racks"
  | "control"
  | "events"
  | "system-charts"
  | "reports"
  | "devices";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { id: "dashboard" as const, label: "Panel", icon: SCADA_ICONS.dashboard },
  { id: "racks" as const, label: "Rack Detaylari", icon: SCADA_ICONS.battery },
  { id: "control" as const, label: "Kontrol", icon: SCADA_ICONS.control },
  {
    id: "system-charts" as const,
    label: "Analitik",
    icon: SCADA_ICONS.charts,
  },
  { id: "reports" as const, label: "Raporlar", icon: SCADA_ICONS.reports },
  { id: "events" as const, label: "Olay & Gecmis", icon: SCADA_ICONS.events },
  { id: "devices" as const, label: "Cihazlar", icon: SCADA_ICONS.container },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, isAuthenticated, isGuest } = useAuth();
  const navigate = useNavigate();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const { fetch: fetchDevices } = useDevicesStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthenticated, fetchDevices]);

  const handleEmergencyStop = async () => {
    if (
      !confirm(
        "ACIL DURDURMA: Tum sistem duracak. Devam etmek istiyor musunuz?",
      )
    ) {
      return;
    }

    setEmergencyLoading(true);
    try {
      const m = MANEUVERS.fl03_emergency_stop;
      if (!m) return;
      const { results } = await controlApi.executeMulti(
        m.steps.map((s) => ({ deviceId: s.deviceId, command: s.command ?? "", params: s.params ?? {} })),
        m.mode,
      );
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(`ACIL DURDUR: ${results.length} adım ✅`);
      } else {
        for (const r of results) {
          if (!r.success) toast.error(`${r.deviceId}: ${r.command} ❌`);
        }
      }
    } catch {
      toast.error("ACIL DURDUR gönderilemedi!");
    } finally {
      setEmergencyLoading(false);
    }
  };

  const LogoIcon = SCADA_ICONS.logo;
  const CollapseIcon = SCADA_ICONS.collapse;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;

  const visibleMenu = !isAuthenticated || user?.role === "guest"
    ? menuItems.filter((item) => item.id === "dashboard")
    : menuItems;

  return (
    <S.SidebarContainer collapsed={collapsed}>
      <S.SidebarLogo collapsed={collapsed}>
        <S.LogoIcon>
          <LogoIcon size={28} />
        </S.LogoIcon>
        {!collapsed && <S.LogoText>CCC</S.LogoText>}
      </S.SidebarLogo>

      <S.SidebarNav>
        {visibleMenu.map((item) => {
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
          aria-label={collapsed ? "Menuyu genislet" : "Menuyu daralt"}
        >
          <CollapseIcon size={14} />
          {!collapsed && <S.ToggleLabel>Daralt</S.ToggleLabel>}
        </S.SidebarToggle>
      </S.ToggleContainer>

      <S.SidebarFooter>
        {isAuthenticated && !isGuest ? (
          <>
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
                        {user?.name ?? "Kullanici"}
                      </S.UserProfileName>
                      <S.UserRoleBadge role={user?.role ?? "guest"}>
                        {user?.role === "admin"
                          ? "Admin"
                          : user?.role === "teknik"
                            ? "Teknik"
                            : "Misafir"}
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
                  <S.UserRoleBadge role={user?.role ?? "guest"}>
                    {user?.role === "admin"
                      ? "Admin"
                      : user?.role === "teknik"
                        ? "Teknik"
                        : "Misafir"}
                  </S.UserRoleBadge>
                </S.UserProfileDetails>
              )}
            </S.UserProfileContainer>

            <S.EmergencyStopBtn
              collapsed={collapsed}
              onClick={handleEmergencyStop}
              disabled={emergencyLoading}
              title={collapsed ? "ACIL DURDUR" : undefined}
            >
              <EmergencyIcon size={collapsed ? 18 : 16} />
              {!collapsed && " ACIL DURDUR"}
            </S.EmergencyStopBtn>

            <LogoutButton collapsed={collapsed} />
          </>
        ) : (
          <S.LoginButton
            collapsed={collapsed}
            onClick={() => navigate("/login")}
            title={collapsed ? "Giris Yap" : undefined}
          >
            <UserIcon size={collapsed ? 18 : 16} />
            {!collapsed && "Giris Yap"}
          </S.LoginButton>
        )}
      </S.SidebarFooter>
    </S.SidebarContainer>
  );
};
