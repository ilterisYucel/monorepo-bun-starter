import React from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashBoardPage";
import { RacksPage } from "../pages/RacksPage";
import { ControlPage } from "../pages/ControlPage";
import { EventsPage } from "../pages/EventsPage";
import { SystemChartsPage } from "../pages/SystemChartsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { DevicesPage } from "../pages/DevicesPage";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import type { PageType } from "../layouts/Sidebar";
import type { Role } from "@gd-monorepo/shared-types";

const PrivateRoute: React.FC<{
  children: React.ReactNode;
  roles?: Role[];
}> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const LayoutWrapper: React.FC<{
  children: React.ReactNode;
  pageType: PageType;
}> = ({ children, pageType }) => {
  return (
    <MainLayout currentPage={pageType} onPageChange={() => {}}>
      {children}
    </MainLayout>
  );
};

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <LayoutWrapper pageType="dashboard">
        <DashboardPage />
      </LayoutWrapper>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <LayoutWrapper pageType="dashboard">
        <DashboardPage />
      </LayoutWrapper>
    ),
  },
  {
    path: "/racks",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="racks">
          <RacksPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/control",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="control">
          <ControlPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/system-charts",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="system-charts">
          <SystemChartsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/events",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="events">
          <EventsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="reports">
          <ReportsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/devices",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapper pageType="devices">
          <DevicesPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
];
