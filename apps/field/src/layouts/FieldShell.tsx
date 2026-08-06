import React, { useState } from "react";
import { Outlet, useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import { SystemHeader } from "./SystemHeader";
import * as S from "./FieldShell.styles";

const NAV_ITEMS = [
  { path: "", label: "Panel", icon: SCADA_ICONS.dashboard },
  { path: "containers", label: "Konteynerler", icon: SCADA_ICONS.container },
  { path: "charts", label: "Grafikler", icon: SCADA_ICONS.charts },
  { path: "control", label: "Kontrol", icon: SCADA_ICONS.control },
  { path: "events", label: "Olaylar", icon: SCADA_ICONS.events },
  { path: "reports", label: "Raporlar", icon: SCADA_ICONS.reports },
  { path: "devices", label: "Cihazlar", icon: SCADA_ICONS.container },
];

export const FieldShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { isAuthenticated, isBoss, logout, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isBoss) {
    return <Navigate to="/map" replace />;
  }

  const currentPath = window.location.pathname;

  const LogoIcon = SCADA_ICONS.logo;
  const CollapseIcon = SCADA_ICONS.collapse;
  const EmergencyIcon = SCADA_ICONS.emergency;
  const UserIcon = SCADA_ICONS.user;
  const LogoutIcon = SCADA_ICONS.logout;

  const roleLabel =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "teknik"
        ? "Teknik"
        : user?.role === "boss"
          ? "Yonetici"
          : "—";

  return (
    <S.Shell>
      <S.SidebarWrapper $collapsed={collapsed}>
        <S.SidebarLogo $collapsed={collapsed}>
          <S.LogoIcon>
            <LogoIcon size={28} />
          </S.LogoIcon>
          {!collapsed && <S.LogoText>SCS</S.LogoText>}
        </S.SidebarLogo>

        <S.SidebarNav>
          {NAV_ITEMS.map((item) => {
            const navPath = `/field/${fieldId}${item.path ? `/${item.path}` : ""}`;
            const active = item.path === ""
              ? currentPath === `/field/${fieldId}`
              : currentPath.startsWith(navPath);
            const Icon = item.icon;
            return (
              <S.NavItem
                key={item.label}
                $active={active}
                $collapsed={collapsed}
                onClick={() => navigate(navPath)}
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
        <S.ToggleContainer $collapsed={collapsed}>
          <S.SidebarToggle
            $collapsed={collapsed}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Menuyu genislet" : "Menuyu daralt"}
          >
            <CollapseIcon size={14} />
            {!collapsed && <S.ToggleLabel>Daralt</S.ToggleLabel>}
          </S.SidebarToggle>
        </S.ToggleContainer>

        <S.SidebarFooter>
          <S.UserProfileDetails>
            <S.UserProfileAvatar>
              <UserIcon size={20} />
            </S.UserProfileAvatar>
            {!collapsed && (
              <>
                <S.UserProfileName>{user?.name ?? "Kullanici"}</S.UserProfileName>
                <S.UserRoleBadge $role={user?.role ?? "teknik"}>
                  {roleLabel}
                </S.UserRoleBadge>
              </>
            )}
          </S.UserProfileDetails>

          {!collapsed && (
            <S.EmergencyStopBtn
              $collapsed={collapsed}
              onClick={() => navigate(`/field/${fieldId}/control`)}
            >
              <EmergencyIcon size={16} />
              {" "}ACIL DURDUR
            </S.EmergencyStopBtn>
          )}

          <S.LogoutBtn
            $collapsed={collapsed}
            onClick={() => logout()}
            title={collapsed ? "Cikis" : undefined}
          >
            <LogoutIcon size={collapsed ? 18 : 16} />
            {!collapsed && <S.LogoutText>Cikis</S.LogoutText>}
          </S.LogoutBtn>
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
