import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "../layouts/AppShell/AppShell";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage";
import { DrawerFullPage } from "../pages/DrawerFullPage/DrawerFullPage";
import { InfoPage } from "../pages/InfoPage/InfoPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "info", element: <InfoPage /> },
      { path: "drawer", element: <DrawerFullPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];
