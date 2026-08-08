import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

export const MobileShell: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: COLORS.bgApp }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "48px",
          padding: "0 16px",
          background: COLORS.bgHeader,
          borderBottom: `1px solid ${COLORS.borderDefault}`,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "16px", color: COLORS.textWhite }}>CCC</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
            {user?.name}
          </span>
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.textMuted,
              fontSize: "13px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            {t("auth.logout")}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: "auto", paddingBottom: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
};
