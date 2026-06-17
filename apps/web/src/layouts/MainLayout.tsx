import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, type PageType } from "./Sidebar";
import { SystemHeader } from "./SystemHeader";
import { useChargeStatus } from "../hooks/useChargeStatus";
import * as S from "./MainLayout.styles";

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPage,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { chargeStatus } = useChargeStatus();

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
    <S.AppLayout>
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <S.MainContent sidebarCollapsed={sidebarCollapsed}>
        <SystemHeader flowDirection={chargeStatus} />
        <S.PageContent>{children}</S.PageContent>
      </S.MainContent>
    </S.AppLayout>
  );
};
