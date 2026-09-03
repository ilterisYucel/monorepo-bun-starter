import React from "react";
import { Outlet, useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { SystemHeader } from "./SystemHeader";
import { visibleNavKeys, emergencyVisible } from "./nav-visibility";
import * as S from "./FieldShell.styles";

const NAV_ITEMS = [
  { path: "", key: "nav.dashboard", icon: SCADA_ICONS.dashboard },
  { path: "containers", key: "nav.containers", icon: SCADA_ICONS.container },
  { path: "pcs", key: "nav.pcs", icon: SCADA_ICONS.powerPlug },
  { path: "control", key: "nav.control", icon: SCADA_ICONS.control },
  { path: "events", key: "nav.eventsShort", icon: SCADA_ICONS.events },
  { path: "reports", key: "nav.reports", icon: SCADA_ICONS.reports },
  { path: "devices", key: "nav.devices", icon: SCADA_ICONS.container },
];

const ROLE_KEYS: Record<string, string> = {
  admin: "common.role.admin",
  teknik: "common.role.teknik",
  boss: "common.role.boss",
  guest: "common.role.guest",
  developer: "common.role.developer",
};

export const FieldShell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { isAuthenticated, logout, user, mfaRequiredRoles } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Faz 1 T1.6: zorunlu şifre değişimi tamamlanmadan uygulama açılmaz
  // (backend rbac'i de 403 verir — çift taraflı enforcement).
  // 2026-08-30: guest İSTİSNADIR (otomatik misafir girişi).
  if (user?.mustChangePassword && user.role !== "guest") {
    return <Navigate to="/change-password" replace />;
  }

  // Faz 6 T6.1: MFA zorunlu roller için kayıt tamamlanmadan uygulama açılmaz
  // (backend rbac'i de 403 verir — çift taraflı). MFA_ENABLED=false ise liste
  // boş gelir — guard devre dışı kalır (debug flag'i).
  const mfaEnrollmentRequired =
    user !== null &&
    mfaRequiredRoles.includes(user.role) &&
    user.mfaEnabled !== true;
  if (mfaEnrollmentRequired) {
    return <Navigate to="/mfa-enroll" replace />;
  }

  // 2026-08-30: boss artık saha uygulamasını KULLANIR (asset yönetimi + veri
  // görüntüleme) — /map redirect'i kaldırıldı; menü rol filtresinden gelir.

  const currentPath = window.location.pathname;

  const LogoIcon = SCADA_ICONS.logo;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;
  const LogoutIcon = SCADA_ICONS.logout;
  const SettingsIcon = SCADA_ICONS.settings;

  const roleLabel = user?.role
    ? t(ROLE_KEYS[user.role] ?? user.role)
    : "—";

  const navKeys = visibleNavKeys(user?.role ?? "guest");
  const navItems = NAV_ITEMS.filter((item) => navKeys.includes(item.key as never));

  return (
    <S.Shell>
      <S.SidebarWrapper>
        <S.SidebarLogo>
          <S.LogoIcon>
            <LogoIcon size={28} />
          </S.LogoIcon>
        </S.SidebarLogo>

        <S.SidebarNav>
          {navItems.map((item) => {
            const navPath = `/field/${fieldId}${item.path ? `/${item.path}` : ""}`;
            const active = item.path === ""
              ? currentPath === `/field/${fieldId}`
              : currentPath.startsWith(navPath);
            const Icon = item.icon;
            const label = t(item.key);
            return (
              <S.NavItem
                key={item.key}
                $active={active}
                onClick={() => navigate(navPath)}
                title={label}
              >
                <S.NavIcon>
                  <Icon size={22} />
                </S.NavIcon>
                <S.NavLabel $active={active}>{label}</S.NavLabel>
              </S.NavItem>
            );
          })}
        </S.SidebarNav>

        <S.SidebarFooter>
          <S.UserBadge title={`${user?.name ?? t("nav.user")} · ${roleLabel}`}>
            <UserIcon size={22} />
          </S.UserBadge>

          {user && emergencyVisible(user.role) && (
            <S.EmergencyStopBtn
              onClick={() => navigate(`/field/${fieldId}/control`)}
              title={t("nav.emergency.button")}
              aria-label={t("nav.emergency.button")}
            >
              <EmergencyIcon size={20} />
            </S.EmergencyStopBtn>
          )}

          <S.FooterBtn
            onClick={() => navigate(`/field/${fieldId}/settings`)}
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
          >
            <SettingsIcon size={20} />
          </S.FooterBtn>

          <S.FooterBtn
            onClick={() => void logout()}
            title={t("auth.logout")}
            aria-label={t("auth.logout")}
          >
            <LogoutIcon size={20} />
          </S.FooterBtn>
        </S.SidebarFooter>
      </S.SidebarWrapper>

      <S.MainArea>
        <SystemHeader fieldId={fieldId} />
        <S.Content>
          <Outlet />
        </S.Content>
      </S.MainArea>
    </S.Shell>
  );
};
