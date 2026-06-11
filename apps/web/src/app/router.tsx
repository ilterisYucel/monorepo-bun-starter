// apps/web/src/app/router.tsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashBoardPage";
import { RacksPage } from "../pages/RacksPage";
import { ControlPage } from "../pages/ControlPage";
import { EventsPage } from "../pages/EventsPage";
import { SystemChartsPage } from "../pages/SystemChartsPage";
import { ReportsPage } from "../pages/ReportsPage";
import type { PageType } from "../layouts/Sidebar";

// Private route wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const token = localStorage.getItem("auth-storage");
  const isAuthenticated = token ? true : false;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout wrapper with page state
const LayoutWrapper: React.FC<{
  children: React.ReactNode;
  pageType: PageType;
}> = ({ children, pageType }) => {
  // Bu state, sidebar'daki aktif sayfayı göstermek için kullanılacak
  // Gerçek uygulamada context veya store kullanılabilir
  return (
    <MainLayout
      currentPage={pageType}
      onPageChange={() => {}}
      pageTitle={getPageTitle(pageType)}
    >
      {children}
    </MainLayout>
  );
};

const getPageTitle = (pageType: PageType): string => {
  switch (pageType) {
    case "dashboard":
      return "📊 Dashboard";
    case "racks":
      return "🔋 Rack Detayları";
    case "control":
      return "🎮 Kontrol Paneli";
    case "events":
      return "📋 Event & History";
    case "system-charts":
      return "📈 Sistem Grafikleri";
    case "reports":
      return "📄 Raporlar";
    default:
      return "EMS";
  }
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="dashboard">
          <DashboardPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="dashboard">
          <DashboardPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/racks",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="racks">
          <RacksPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/control",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="control">
          <ControlPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/events",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="events">
          <EventsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/system-charts",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="system-charts">
          <SystemChartsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <PrivateRoute>
        <LayoutWrapper pageType="reports">
          <ReportsPage />
        </LayoutWrapper>
      </PrivateRoute>
    ),
  },
]);
