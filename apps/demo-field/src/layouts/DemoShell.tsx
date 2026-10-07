import React from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { COLORS_LIGHT } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { isTunnelMode } from "../lib/api-base";
import { siteFieldId } from "../lib/site-field";
import logoLight from "../assets/logo-light.png";

/**
 * DemoShell — auth guard + üst bar (marka, Saha/Manevra sekmeleri, çıkış).
 * Işık tema (nova). Tek saha modeli: fieldId VITE_FIELD_ID'den gelir.
 * Header/footer'da GDEMS logosu; yüklenemezse "GD-PMS" metnine düşer (K3).
 */
export const DemoShell: React.FC = () => {
  const fieldId = siteFieldId();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [logoOk, setLogoOk] = React.useState(true);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const onManeuver = location.pathname.endsWith("/manevra");
  const onDevices = location.pathname.endsWith("/cihazlar");
  const onFaults = location.pathname.endsWith("/faults");
  const onMarket = location.pathname.endsWith("/market");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS_LIGHT.bg,
        color: COLORS_LIGHT.fg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "10px 16px",
          background: COLORS_LIGHT.panel,
          borderBottom: `1px solid ${COLORS_LIGHT.line}`,
        }}
      >
        {logoOk ? (
          <img
            src={logoLight}
            alt="GDEMS"
            height={28}
            onError={() => setLogoOk(false)}
            data-testid="demo-logo"
          />
        ) : (
          <strong style={{ color: COLORS_LIGHT.fg, letterSpacing: "0.04em" }}>
            GD-PMS
          </strong>
        )}
        <nav style={{ display: "flex", gap: "4px" }}>
          <ShellTab to={base} label="Saha yerleşimi" active={!onManeuver && !onDevices && !onFaults && !onMarket} />
          <ShellTab to={`${base}/cihazlar`} label="Cihazlar" active={onDevices} />
          <ShellTab to={`${base}/faults`} label="Faults" active={onFaults} />
          <ShellTab to={`${base}/market`} label="Grid & Market" active={onMarket} />
          <ShellTab to={`${base}/manevra`} label="Manevra" active={onManeuver} />
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            background: "none",
            border: `1px solid ${COLORS_LIGHT.line}`,
            color: COLORS_LIGHT.muted,
            borderRadius: "5px",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Çıkış
        </button>
      </header>
      <main style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderTop: `1px solid ${COLORS_LIGHT.line}`,
          color: COLORS_LIGHT.dim,
          fontSize: "11px",
        }}
      >
        {logoOk && <img src={logoLight} alt="GDEMS" height={18} />}
        <span>ÜNSAL DGES · GDE-202030</span>
      </footer>
    </div>
  );
};

const ShellTab: React.FC<{ to: string; label: string; active: boolean }> = ({
  to,
  label,
  active,
}) => (
  <Link
    to={to}
    style={{
      borderBottom: `2px solid ${active ? COLORS_LIGHT.sel : "transparent"}`,
      color: active ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
      fontWeight: 600,
      padding: "7px 12px",
    }}
  >
    {label}
  </Link>
);
