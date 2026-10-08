import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { DemoShell } from "../layouts/DemoShell";
import { DemoProjectLayout } from "../layouts/DemoProjectLayout";
import { LoginPage } from "../pages/LoginPage";
import { DemoFieldPage } from "../pages/DemoFieldPage";
import { DemoDevicesPage } from "../pages/DemoDevicesPage";
import { DemoFaultsPage } from "../pages/DemoFaultsPage";
import { DemoMarketPage } from "../pages/DemoMarketPage";
import { DemoManeuverPage } from "../pages/DemoManeuverPage";
import { DemoAdminPage } from "../pages/DemoAdminPage";

/**
 * Demo-field rotaları — proje sekmeleri ortak `DemoProjectLayout` (pinfo → KPI
 * → ready → trendler → görünüm → log) altında; iki eş: standalone
 * `/field/:fieldId/*` ve boss tüneli `/fields/:fieldId/ui/*` (SPEC K-4/K-5).
 * Eski yollar (`cihazlar`, `manevra`) yeni rota adlarına yönlendirilir.
 */

const projectChildren: RouteObject[] = [
  { index: true, element: <DemoFieldPage /> },
  { path: "devices", element: <DemoDevicesPage /> },
  { path: "operations", element: <DemoManeuverPage /> },
  { path: "market", element: <DemoMarketPage /> },
  { path: "faults", element: <DemoFaultsPage /> },
  { path: "admin", element: <DemoAdminPage /> },
  { path: "cihazlar", element: <Navigate to="../devices" replace /> },
  { path: "manevra", element: <Navigate to="../operations" replace /> },
];

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "fields/:fieldId/ui/login", element: <LoginPage /> },
  {
    path: "/",
    element: <DemoShell />,
    children: [
      { path: "field/:fieldId", element: <DemoProjectLayout />, children: projectChildren },
      { path: "fields/:fieldId/ui", element: <DemoProjectLayout />, children: projectChildren },
    ],
  },
];
