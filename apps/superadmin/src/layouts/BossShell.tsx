import React from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { ScadaIconName } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import {
  useUnreadCount,
  readLastSeen,
} from "../features/notifications/hooks/useNotifications";
import { useFieldList } from "../features/fields/hooks/useAdminFields";
import { useMarket } from "../features/market/hooks/useMarket";
import { BossSettingsPanel } from "../features/settings/BossSettingsPanel";
import * as S from "./BossShell.styles";

export interface BossNavItem {
  path: string;
  key: string;
  icon: ScadaIconName;
}

export const BOSS_NAV_ITEMS: BossNavItem[] = [
  { path: "/fields", key: "boss.nav.fields", icon: "map" },
  { path: "/market", key: "boss.nav.market", icon: "market" },
  { path: "/notifications", key: "boss.nav.notifications", icon: "notification" },
];

const MenuIcon = SCADA_ICONS.menu;
const CloseIcon = SCADA_ICONS.close;
const LogoutIcon = SCADA_ICONS.logout;
const LogoIcon = SCADA_ICONS.logo;
const SettingsIcon = SCADA_ICONS.settings;
const UserIcon = SCADA_ICONS.user;
const MapIcon = SCADA_ICONS.map;
const MarketIcon = SCADA_ICONS.market;
const ClockIcon = SCADA_ICONS.timer;

const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? "—" : `${value.toFixed(0)} ₺`;

/**
 * BossShell — patron uygulaması responsif kabuğu.
 * Container-web/field deseniyle bütünleşik: logo icon'lu sidebar,
 * system-bar header (saha/online sayaçları + saat + kullanıcı),
 * footer'da ayarlar modalı + çıkış.
 */
export const BossShell: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [now, setNow] = React.useState(new Date());

  const lastSeen = readLastSeen();
  const { data: unreadCount } = useUnreadCount(lastSeen);
  const unread = unreadCount ?? 0;
  const { data: fields } = useFieldList();
  const { data: market } = useMarket();

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  const activePath =
    BOSS_NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))?.path ??
    "/fields";

  const go = (path: string) => {
    navigate(path);
  };

  const fieldCount = fields?.length ?? 0;
  const onlineCount =
    fields?.filter((field) => field.status === "online").length ?? 0;
  const ptf = market?.summary?.ptf?.value;
  const gip = market?.summary?.gipWeightedAverage?.value;

  return (
    <S.Shell>
      <S.Rail aria-label="boss-navigation">
        <S.RailBrand>
          <S.LogoIcon>
            <LogoIcon size={26} />
          </S.LogoIcon>
        </S.RailBrand>
        <S.RailNav>
          {BOSS_NAV_ITEMS.map((item) => {
            const Icon = SCADA_ICONS[item.icon];
            return (
              <S.NavButton
                key={item.path}
                $active={activePath === item.path}
                onClick={() => go(item.path)}
                aria-label={t(item.key)}
              >
                <Icon size={20} />
                <span>{t(item.key)}</span>
                {item.path === "/notifications" && unread > 0 && (
                  <S.NavBadge>{unread > 99 ? "99+" : unread}</S.NavBadge>
                )}
              </S.NavButton>
            );
          })}
        </S.RailNav>
        <S.RailFooter>
          <S.FooterUser title={`${user?.name ?? ""}`}>
            <UserIcon size={20} />
          </S.FooterUser>
          <S.FooterBtn
            onClick={() => setShowSettings(true)}
            title={t("boss.nav.settings")}
            aria-label={t("boss.nav.settings")}
          >
            <SettingsIcon size={20} />
          </S.FooterBtn>
          <S.FooterBtn
            onClick={() => void logout()}
            title={t("auth.logout")}
            aria-label={t("auth.logout")}
          >
            <LogoutIcon size={18} />
          </S.FooterBtn>
        </S.RailFooter>
      </S.Rail>

      <S.Content>
        <S.HeaderBar>
          <S.IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label={t("nav.expand")}
          >
            <MenuIcon size={20} />
          </S.IconButton>
          <S.HeaderGrid>
            <S.HeaderBox>
              <MapIcon size={16} />
              <S.HeaderLabel>
                {t("boss.fieldsCount")} {fieldCount} · {onlineCount}{" "}
                {t("boss.onlineSummary")}
              </S.HeaderLabel>
            </S.HeaderBox>
            <S.HeaderBox>
              <MarketIcon size={16} />
              <S.HeaderLabel>PTF</S.HeaderLabel>
              <S.HeaderMono>{formatPrice(ptf)}</S.HeaderMono>
            </S.HeaderBox>
            <S.HeaderBox>
              <MarketIcon size={16} />
              <S.HeaderLabel>GİP</S.HeaderLabel>
              <S.HeaderMono>{formatPrice(gip)}</S.HeaderMono>
            </S.HeaderBox>
            <S.HeaderBox>
              <ClockIcon size={16} />
              <S.HeaderMono>
                {now.toLocaleString(locale(), {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </S.HeaderMono>
            </S.HeaderBox>
          </S.HeaderGrid>
        </S.HeaderBar>

        <S.Main>
          <Outlet />
        </S.Main>
      </S.Content>

      {drawerOpen && (
        <>
          <S.DrawerBackdrop onClick={() => setDrawerOpen(false)} />
          <S.Drawer aria-label="boss-drawer">
            <S.DrawerBrand>
              <S.LogoIcon>
                <LogoIcon size={26} />
              </S.LogoIcon>
              <S.IconButton
                onClick={() => setDrawerOpen(false)}
                aria-label={t("nav.collapseShort")}
              >
                <CloseIcon size={18} />
              </S.IconButton>
            </S.DrawerBrand>
            {BOSS_NAV_ITEMS.map((item) => {
              const Icon = SCADA_ICONS[item.icon];
              return (
                <S.DrawerNavButton
                  key={item.path}
                  $active={activePath === item.path}
                  onClick={() => go(item.path)}
                >
                  <Icon size={18} />
                  <span>{t(item.key)}</span>
                  {item.path === "/notifications" && unread > 0 && (
                    <S.NavBadge>{unread > 99 ? "99+" : unread}</S.NavBadge>
                  )}
                </S.DrawerNavButton>
              );
            })}
            <S.DrawerNavButton
              $active={false}
              onClick={() => {
                setShowSettings(true);
                setDrawerOpen(false);
              }}
            >
              <SettingsIcon size={18} />
              <span>{t("boss.nav.settings")}</span>
            </S.DrawerNavButton>
            <S.DrawerNavButton
              $active={false}
              onClick={() => void logout()}
            >
              <LogoutIcon size={18} />
              <span>{t("auth.logout")}</span>
            </S.DrawerNavButton>
          </S.Drawer>
        </>
      )}

      {showSettings && <BossSettingsPanel onClose={() => setShowSettings(false)} />}
    </S.Shell>
  );
};
