import type { RouteObject } from "react-router-dom";
import { DemoShell } from "../layouts/DemoShell";
import { LoginPage } from "../pages/LoginPage";
import { DemoFieldPage } from "../pages/DemoFieldPage";
import { DemoDevicesPage } from "../pages/DemoDevicesPage";
import { DemoFaultsPage } from "../pages/DemoFaultsPage";
import { DemoMarketPage } from "../pages/DemoMarketPage";
import { DemoManeuverPage } from "../pages/DemoManeuverPage";

/**
 * Demo-field rotaları — iki eş: standalone `/field/:fieldId/*` ve boss tüneli
 * `/fields/:fieldId/ui/*` (mevcut field deseni). Saha + Cihazlar + Manevra
 * ekranları vardır (MFA/şifre/reports kapsam dışı — SPEC K2/§1).
 */
export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "fields/:fieldId/ui/login", element: <LoginPage /> },
  {
    path: "/",
    element: <DemoShell />,
    children: [
      { path: "field/:fieldId", element: <DemoFieldPage /> },
      { path: "field/:fieldId/cihazlar", element: <DemoDevicesPage /> },
      { path: "field/:fieldId/faults", element: <DemoFaultsPage /> },
      { path: "field/:fieldId/market", element: <DemoMarketPage /> },
      { path: "field/:fieldId/manevra", element: <DemoManeuverPage /> },
      { path: "fields/:fieldId/ui", element: <DemoFieldPage /> },
      { path: "fields/:fieldId/ui/cihazlar", element: <DemoDevicesPage /> },
      { path: "fields/:fieldId/ui/faults", element: <DemoFaultsPage /> },
      { path: "fields/:fieldId/ui/market", element: <DemoMarketPage /> },
      { path: "fields/:fieldId/ui/manevra", element: <DemoManeuverPage /> },
    ],
  },
];
