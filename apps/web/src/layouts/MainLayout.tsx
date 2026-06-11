// apps/web/src/layouts/MainLayout.tsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, type PageType } from "./Sidebar";
import { Header } from "./Header";
import "./MainLayout.css";

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  pageTitle: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  pageTitle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route değiştiğinde sidebar'daki aktif sayfayı güncelle
  useEffect(() => {
    const path = location.pathname.substring(1);
    if (path === "" || path === "dashboard") {
      onPageChange("dashboard");
    } else if (path === "racks") {
      onPageChange("racks");
    } else if (path === "control") {
      onPageChange("control");
    } else if (path === "events") {
      onPageChange("events");
    } else if (path === "system-charts") {
      onPageChange("system-charts");
    } else if (path === "reports") {
      onPageChange("reports");
    }
  }, [location, onPageChange]);

  const handlePageChange = (page: PageType) => {
    onPageChange(page);
    navigate(`/${page === "dashboard" ? "" : page}`);
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="main-content">
        <Header pageTitle={pageTitle} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
};
