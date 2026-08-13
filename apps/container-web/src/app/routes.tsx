import React from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LayoutWrapperV2 } from "../layouts/MainLayoutV2";
import type { PageTypeV2 } from "../layouts/SidebarV2.types";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashBoardPage";
import { DashboardPageV2 } from "../pages/DashBoardPageV2";
import { RacksPage } from "../pages/RacksPage";
import { BscPage } from "../pages/BscPage";
import { HvacPage } from "../pages/HvacPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { ControlPage } from "../pages/ControlPage";
import { EventsPage } from "../pages/EventsPage";
import { SystemChartsPage } from "../pages/SystemChartsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { DevicesPage } from "../pages/DevicesPage";
import { FirePanelPage } from "../pages/FirePanelPage";
import { EnergyAnalyzerPage } from "../pages/EnergyAnalyzerPage";
import { ScadaDashboardPage } from "../pages/ScadaDashboardPage";
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

const LayoutWrapperV2Component: React.FC<{
  children: React.ReactNode;
  pageType: PageTypeV2;
}> = ({ children, pageType }) => {
  return (
    <LayoutWrapperV2 pageType={pageType}>
      {children}
    </LayoutWrapperV2>
  );
};

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  // ═══════════════════════════════════════════════════════════════════
  // V2 ROUTES — Aktif
  // ═══════════════════════════════════════════════════════════════════
  {
    path: "/",
    element: (
      <LayoutWrapperV2Component pageType="dashboard">
        <DashboardPageV2 />
      </LayoutWrapperV2Component>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <LayoutWrapperV2Component pageType="dashboard">
        <DashboardPageV2 />
      </LayoutWrapperV2Component>
    ),
  },
  {
    path: "/scada",
    element: (
      <LayoutWrapperV2Component pageType="scada">
        <ScadaDashboardPage />
      </LayoutWrapperV2Component>
    ),
  },
  {
    path: "/bsc",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="bsc">
          <BscPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/fire",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="fire">
          <FirePanelPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/energy-analyzer",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="energy-analyzer">
          <EnergyAnalyzerPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/hvac",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="hvac">
          <HvacPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/control",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="control">
          <ControlPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/system-charts",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="system-charts">
          <SystemChartsPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/events",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="events">
          <EventsPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="reports">
          <ReportsPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="analytics">
          <AnalyticsPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  {
    path: "/devices",
    element: (
      <PrivateRoute roles={["admin", "teknik"]}>
        <LayoutWrapperV2Component pageType="devices">
          <DevicesPage />
        </LayoutWrapperV2Component>
      </PrivateRoute>
    ),
  },
  // ═══════════════════════════════════════════════════════════════════
  // V1 ROUTES — Geri dönüş için korunuyor
  // ═══════════════════════════════════════════════════════════════════
  /*
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
  */
];
