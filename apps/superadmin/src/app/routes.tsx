import type { RouteObject } from "react-router-dom";
import { MobileShell } from "../layouts/MobileShell";
import { LoginPage } from "../pages/LoginPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { DashboardPage } from "../pages/DashboardPage";
import { FieldDetailPage } from "../pages/FieldDetailPage";

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
    element: <MobileShell />,
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "fields/:id",
        element: <FieldDetailPage />,
      },
    ],
  },
];
