import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NOVA_ICONS } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { isTunnelMode } from "../lib/api-base";
import { siteFieldId } from "../lib/site-field";
import { useDemoTheme } from "../lib/demo-theme";
import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";

/**
 * DemoShell — auth guard + referans konsol kabuğu (SPEC UC-1): logo, breadcrumb,
 * 6 sekme (İngilizce), "Demo data" rozeti, tema toggle, saat, çıkış; altta
 * footer. Tema light/dark (localStorage + prefers-color-scheme).
 */

interface ShellTabDef {
  to: string;
  label: string;
  match: (p: string) => boolean;
}

export const DemoShell: React.FC = () => {
  const fieldId = siteFieldId();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [logoOk, setLogoOk] = useState(true);
  const [theme, setTheme] = useDemoTheme();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const endsWith = (suffix: string) => location.pathname.endsWith(suffix);
  const isSite =
    !endsWith("/devices") &&
    !endsWith("/operations") &&
    !endsWith("/market") &&
    !endsWith("/faults") &&
    !endsWith("/admin");

  const tabs: ShellTabDef[] = [
    { to: base, label: "Site layout", match: () => isSite },
    { to: `${base}/devices`, label: "Devices", match: () => endsWith("/devices") },
    { to: `${base}/operations`, label: "Operations", match: () => endsWith("/operations") },
    { to: `${base}/market`, label: "Grid & Market", match: () => endsWith("/market") },
    { to: `${base}/faults`, label: "Faults", match: () => endsWith("/faults") },
    { to: `${base}/admin`, label: "Admin", match: () => endsWith("/admin") },
  ];

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate("/login", { replace: true });
  };

  const hhmmss = `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}:${String(
    clock.getSeconds(),
  ).padStart(2, "0")}`;

  return (
    <div className="nova-console" style={{ padding: 10 }}>
      <header className="top">
        <span className="brand" aria-label="GDEMS">
          {logoOk ? (
            <img
              className="logo"
              src={theme === "dark" ? logoDark : logoLight}
              alt="GDEMS"
              onError={() => setLogoOk(false)}
              data-testid="demo-logo"
            />
          ) : (
            <strong>GD-PMS</strong>
          )}
        </span>
        <nav className="crumbs" aria-label="Breadcrumb">
          <span style={{ color: "var(--nm-muted)" }}>Projects</span>
          <span>/</span>
          <b>ÜNSAL DGES</b>
        </nav>
        <nav className="tabs" role="tablist" aria-label="Project screens">
          {tabs.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={t.match()}
              className={t.match() ? "active" : ""}
              onClick={() => navigate(t.to)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="r">
          <span className="seg sm" role="group" aria-label="Theme">
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              title="Light"
            >
              <NOVA_ICONS.sun size={14} />
              Light
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
              title="Dark"
            >
              <NOVA_ICONS.moon size={14} />
              Dark
            </button>
          </span>
          <span className="demo-tag">Demo data</span>
          <span className="clock num">{hhmmss}</span>
          <button type="button" className="btn sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ minWidth: 0 }}>
        <Outlet />
      </main>
      <footer className="foot">
        {logoOk ? <img src={logoLight} alt="GDEMS" height={14} style={{ opacity: 0.8 }} /> : null}
        <span>
          Illustrative interface · simulated data · topology GDE-202030 S-002 / E-001
        </span>
      </footer>
    </div>
  );
};
