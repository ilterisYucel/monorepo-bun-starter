import type { RouteObject } from "react-router-dom";
import { FieldShell } from "../layouts/FieldShell";
import { LoginPage } from "../pages/LoginPage";
import { FieldDashboardPage } from "../pages/FieldDashboardPage";
import { ContainersPage } from "../pages/ContainersPage";
import { ContainerDetailPage } from "../pages/ContainerDetailPage";
import { FieldChartsPage } from "../pages/FieldChartsPage";
import { FieldControlPage } from "../pages/FieldControlPage";
import { FieldEventsPage } from "../pages/FieldEventsPage";
import { FieldReportsPage } from "../pages/FieldReportsPage";
import { FieldDevicesPage } from "../pages/FieldDevicesPage";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
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
        path: "field/:fieldId/charts",
        element: <FieldChartsPage />,
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
    ],
  },
];
