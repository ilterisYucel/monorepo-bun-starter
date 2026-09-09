import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { BossShell } from "../layouts/BossShell";
import { LoginPage } from "../pages/LoginPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { FieldsPage } from "../pages/FieldsPage";
import { FieldDetailPage } from "../pages/FieldDetailPage";
import { MarketPage } from "../pages/MarketPage";
import { NotificationsPage } from "../pages/NotificationsPage";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/change-password",
    element: <ChangePasswordPage />,
  },
  {
    path: "/",
    element: <BossShell />,
    children: [
      {
        path: "fields",
        element: <FieldsPage />,
      },
      {
        path: "fields/:id",
        element: <FieldDetailPage />,
      },
      {
        path: "market",
        element: <MarketPage />,
      },
      {
        path: "notifications",
        element: <NotificationsPage />,
      },
      {
        index: true,
        element: <Navigate to="/fields" replace />,
      },
      {
        // Eski rotalar (/dashboard, /assets, /settings) ve bilinmeyen
        // yollar boş ekranda kalmasın — Sahalar'a düşer.
        path: "*",
        element: <Navigate to="/fields" replace />,
      },
    ],
  },
];
