import React, { useState } from "react";
import { useAuth, Login } from "./modules/auth";
import { Layout } from "./components/layout/Layout/Layout";
import { DashboardPage } from "./pages/Dashboard/Page";
import { RacksDetailPage } from "./pages/RackDetails/Page";
import { ControlPage } from "./pages/Control/Page";
import { ReportsPage } from "./pages/Reports/Page";
import "./App.css";
import type { PageType } from "./components/layout/Sidebar/Sidebar";

const pageTitles: Record<PageType, string> = {
  dashboard: "📊 Dashboard",
  racks: "🔋 Rack Detayları",
  control: " 🎮 Kontrol Paneli",
  reports: "📄 Raporlar",
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "racks":
        return <RacksDetailPage />;
      case "control":
        return <ControlPage />;
      case "reports":
        return <ReportsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      pageTitle={pageTitles[currentPage]}
    >
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
