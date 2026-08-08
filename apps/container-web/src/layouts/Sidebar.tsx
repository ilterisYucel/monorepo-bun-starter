import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { LogoutButton } from "../features/auth";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useDevicesStore } from "../stores/devicesStore";
import { controlApi } from "../features/control/services/controlApi";
import { MANEUVERS } from "../features/control/maneuvers";
import { SettingsPanel } from "../features/settings";
import * as S from "./Sidebar.styles";

export type PageType =
  | "dashboard"
  | "racks"
  | "control"
  | "events"
  | "system-charts"
  | "reports"
  | "devices"
  | "fire";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_KEY: Record<string, string> = {
  dashboard: "nav.dashboard",
  racks: "nav.racks",
  control: "nav.control",
  "system-charts": "nav.analytics",
  reports: "nav.reports",
  events: "nav.events",
  devices: "nav.devices",
  fire: "nav.fire",
};

const ROLE_KEY: Record<string, string> = {
  admin: "common.role.admin",
  teknik: "common.role.teknik",
  guest: "common.role.guest",
  boss: "common.role.boss",
};

const menuItems = [
  { id: "dashboard" as const, icon: SCADA_ICONS.dashboard },
  { id: "racks" as const, icon: SCADA_ICONS.battery },
  { id: "control" as const, icon: SCADA_ICONS.control },
  { id: "system-charts" as const, icon: SCADA_ICONS.charts },
  { id: "reports" as const, icon: SCADA_ICONS.reports },
  { id: "events" as const, icon: SCADA_ICONS.events },
  { id: "devices" as const, icon: SCADA_ICONS.container },
  { id: "fire" as const, icon: SCADA_ICONS.fireAlarm },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isGuest } = useAuth();
  const navigate = useNavigate();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { fetch: fetchDevices } = useDevicesStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthenticated, fetchDevices]);

  const handleEmergencyStop = async () => {
    if (!confirm(t("nav.emergency.confirm"))) return;

    setEmergencyLoading(true);
    try {
      const m = MANEUVERS.fl03_emergency_stop;
      if (!m) return;
      const { results } = await controlApi.executeMulti(
        m.steps.map((s) => ({
          deviceId: s.deviceId,
          command: s.command ?? "",
          params: s.params ?? {},
        })),
        m.mode,
      );
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(
          `${t("nav.emergency.button")}: ${results.length} ${t("maneuver.steps").toLowerCase()} ✅`,
        );
      } else {
        for (const r of results) {
          if (!r.success) toast.error(`${r.deviceId}: ${r.command} ❌`);
        }
      }
    } catch {
      toast.error(`${t("nav.emergency.button")} gönderilemedi!`);
    } finally {
      setEmergencyLoading(false);
    }
  };

  const getRoleLabel = (role: string): string =>
    t(ROLE_KEY[role] ?? role);

  const LogoIcon = SCADA_ICONS.logo;
  const CollapseIcon = SCADA_ICONS.collapse;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;
  const SettingsIcon = SCADA_ICONS.settings;

  const visibleMenu =
    !isAuthenticated || user?.role === "guest"
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
          const label = t(NAV_KEY[item.id] ?? item.id);
          return (
            <S.NavItem
              key={item.id}
              active={currentPage === item.id}
              collapsed={collapsed}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? label : undefined}
            >
              <S.NavIcon>
                <Icon size={20} />
              </S.NavIcon>
              {!collapsed && <S.NavLabel>{label}</S.NavLabel>}
            </S.NavItem>
          );
        })}
      </S.SidebarNav>

      <S.ToggleSeparator />
      <S.ToggleContainer collapsed={collapsed}>
        <S.SidebarToggle
          collapsed={collapsed}
          onClick={onToggleCollapse}
          aria-label={
            collapsed ? t("nav.expand") : t("nav.collapse")
          }
        >
          <CollapseIcon size={14} />
          {!collapsed && (
            <S.ToggleLabel>{t("nav.collapse")}</S.ToggleLabel>
          )}
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
                        {user?.name ?? t("nav.user")}
                      </S.UserProfileName>
                      <S.UserRoleBadge role={user?.role ?? "guest"}>
                        {getRoleLabel(user?.role ?? "guest")}
                      </S.UserRoleBadge>
                    </S.UserProfilePopup>
                  )}
                </>
              ) : (
                <S.UserProfileDetails>
                  <S.UserProfileAvatar>
                    <UserIcon size={20} />
                  </S.UserProfileAvatar>
                  <S.UserProfileName>
                    {user?.name}
                  </S.UserProfileName>
                  <S.UserRoleBadge role={user?.role ?? "guest"}>
                    {getRoleLabel(user?.role ?? "guest")}
                  </S.UserRoleBadge>
                </S.UserProfileDetails>
              )}
            </S.UserProfileContainer>

            <S.SettingsBtn
              collapsed={collapsed}
              onClick={() => setShowSettings(true)}
              title={collapsed ? t("settings.button") : undefined}
            >
              <SettingsIcon size={20} />
              {!collapsed && t("settings.button")}
            </S.SettingsBtn>

            <S.EmergencyStopBtn
              collapsed={collapsed}
              onClick={handleEmergencyStop}
              disabled={emergencyLoading}
              title={
                collapsed ? t("nav.emergency.button") : undefined
              }
            >
              <EmergencyIcon size={collapsed ? 18 : 16} />
              {!collapsed && ` ${t("nav.emergency.button")}`}
            </S.EmergencyStopBtn>

            <LogoutButton collapsed={collapsed} />
          </>
        ) : (
          <S.LoginButton
            collapsed={collapsed}
            onClick={() => navigate("/login")}
            title={collapsed ? t("auth.login") : undefined}
          >
            <UserIcon size={collapsed ? 18 : 16} />
            {!collapsed && t("auth.login")}
          </S.LoginButton>
        )}
      </S.SidebarFooter>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </S.SidebarContainer>
  );
};
