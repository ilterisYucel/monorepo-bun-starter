import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { useAuth } from "../features/auth/hooks/useAuth";
import { controlApi } from "../features/control/services/controlApi";
import { MANEUVERS } from "../features/control/maneuvers";
import { SettingsPanel } from "../features/settings";
import { useDevicesStore } from "../stores/devicesStore";
import type { SidebarV2Props, PageTypeV2 } from "./SidebarV2.types";
import * as S from "./SidebarV2.styles";

const NAV_KEY: Record<string, string> = {
  dashboard: "nav.dashboard",
  scada: "nav.scada",
  bsc: "nav.bsc",
  fire: "nav.fire",
  "energy-analyzer": "nav.energyAnalyzer",
  hvac: "nav.hvac",
  control: "nav.control",
  "system-charts": "nav.systemCharts",
  events: "nav.events",
  reports: "nav.reports",
  analytics: "nav.analytics",
  devices: "nav.devices",
};

const ROLE_KEY: Record<string, string> = {
  admin: "common.role.admin",
  teknik: "common.role.teknik",
  guest: "common.role.guest",
  boss: "common.role.boss",
};

const menuItemsV2: Array<{ id: PageTypeV2; icon: React.FC<{ size: number }> }> = [
  { id: "dashboard",       icon: SCADA_ICONS.dashboard },
  { id: "scada",           icon: SCADA_ICONS.scadaChart },
  { id: "bsc",             icon: SCADA_ICONS.bsc },
  { id: "fire",            icon: SCADA_ICONS.fireAlarm },
  { id: "energy-analyzer", icon: SCADA_ICONS.energyAnalyzer },
  { id: "hvac",            icon: SCADA_ICONS.hvac },
  { id: "control",         icon: SCADA_ICONS.control },
  { id: "events",          icon: SCADA_ICONS.events },
  { id: "reports",         icon: SCADA_ICONS.reports },
  { id: "devices",         icon: SCADA_ICONS.container },
];

export { type PageTypeV2 };

export const SidebarV2: React.FC<SidebarV2Props> = ({
  currentPage,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isGuest, logout } = useAuth();
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

  const handleNavigate = (page: PageTypeV2) => {
    onPageChange(page);
    navigate(page === "dashboard" ? "/" : `/${page}`);
  };

  const LogoIcon = SCADA_ICONS.logo;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;
  const SettingsIcon = SCADA_ICONS.settings;

  const visibleMenu =
    !isAuthenticated || user?.role === "guest"
      ? menuItemsV2.filter((item) => item.id === "dashboard")
      : menuItemsV2;

  return (
    <S.SidebarContainer>
      <S.SidebarLogo>
        <S.LogoIcon>
          <LogoIcon size={28} />
        </S.LogoIcon>
      </S.SidebarLogo>

      <S.SidebarNav>
        {visibleMenu.map((item) => {
          const Icon = item.icon;
          const label = t(NAV_KEY[item.id] ?? item.id);
          const isActive = currentPage === item.id;
          return (
            <S.NavItem
              key={item.id}
              $active={isActive}
              onClick={() => handleNavigate(item.id)}
              title={label}
            >
              <S.NavIcon>
                <Icon size={22} />
              </S.NavIcon>
              <S.NavLabel $active={isActive}>{label}</S.NavLabel>
            </S.NavItem>
          );
        })}
      </S.SidebarNav>

      <S.SidebarFooter>
        {isAuthenticated && !isGuest ? (
          <>
            <S.UserProfileContainer>
              <S.UserAvatarBtn
                onClick={() => setShowProfilePopup((prev) => !prev)}
                title={t("nav.user")}
              >
                <UserIcon size={22} />
              </S.UserAvatarBtn>
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
            </S.UserProfileContainer>

            <S.FooterBtn
              onClick={() => setShowSettings(true)}
              title={t("settings.button")}
            >
              <SettingsIcon size={20} />
            </S.FooterBtn>

            <S.EmergencyStopBtn
              onClick={handleEmergencyStop}
              disabled={emergencyLoading}
              title={t("nav.emergency.button")}
            >
              <EmergencyIcon size={20} />
            </S.EmergencyStopBtn>

            <S.FooterBtn onClick={() => void logout()} title={t("auth.logout")}>
              <SCADA_ICONS.logout size={20} />
            </S.FooterBtn>
          </>
        ) : (
          <S.LoginButton
            onClick={() => navigate("/login")}
            title={t("auth.login")}
          >
            <UserIcon size={20} />
          </S.LoginButton>
        )}
      </S.SidebarFooter>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </S.SidebarContainer>
  );
};

SidebarV2.displayName = "SidebarV2";
