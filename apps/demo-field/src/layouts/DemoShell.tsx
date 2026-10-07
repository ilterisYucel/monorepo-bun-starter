import React from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { COLORS_LIGHT } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { isTunnelMode } from "../lib/api-base";
import { siteFieldId } from "../lib/site-field";

/**
 * DemoShell — auth guard + üst bar (marka, Saha/Manevra sekmeleri, çıkış).
 * Işık tema (nova). Tek saha modeli: fieldId VITE_FIELD_ID'den gelir.
 */
export const DemoShell: React.FC = () => {
  const fieldId = siteFieldId();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const onManeuver = location.pathname.endsWith("/manevra");

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
        <strong style={{ color: COLORS_LIGHT.fg, letterSpacing: "0.04em" }}>
          GD-PMS
        </strong>
        <nav style={{ display: "flex", gap: "4px" }}>
          <ShellTab to={base} label="Saha yerleşimi" active={!onManeuver} />
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
