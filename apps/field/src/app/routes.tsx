import type { RouteObject } from "react-router-dom";
import { FieldShell } from "../layouts/FieldShell";
import { LoginPage } from "../pages/LoginPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { MfaEnrollPage } from "../pages/MfaEnrollPage";
import { FieldDashboardPage } from "../pages/FieldDashboardPage";
import { ContainersPage } from "../pages/ContainersPage";
import { ContainerDetailPage } from "../pages/ContainerDetailPage";
import { FieldPcsPage } from "../pages/FieldPcsPage";
import { FieldControlPage } from "../pages/FieldControlPage";
import { FieldEventsPage } from "../pages/FieldEventsPage";
import { FieldReportsPage } from "../pages/FieldReportsPage";
import { FieldDevicesPage } from "../pages/FieldDevicesPage";
import { SettingsPage } from "../pages/SettingsPage";

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
    // Faz 6 T6.1 — TOTP kayıt akışı (zorunlu MFA)
    path: "/mfa-enroll",
    element: <MfaEnrollPage />,
  },
  {
    path: "/",
    element: <FieldShell />,
    children: [
      {
        path: "field/:fieldId",
        element: <FieldDashboardPage />,
      },
      {
        path: "field/:fieldId/containers",
        element: <ContainersPage />,
      },
      {
        path: "field/:fieldId/containers/:containerId",
        element: <ContainerDetailPage />,
      },
      {
        path: "field/:fieldId/pcs",
        element: <FieldPcsPage />,
      },
      {
        path: "field/:fieldId/control",
        element: <FieldControlPage />,
      },
      {
        path: "field/:fieldId/events",
        element: <FieldEventsPage />,
      },
      {
        path: "field/:fieldId/reports",
        element: <FieldReportsPage />,
      },
      {
        path: "field/:fieldId/devices",
        element: <FieldDevicesPage />,
      },
      {
        path: "field/:fieldId/settings",
        element: <SettingsPage />,
      },
    ],
  },
];
