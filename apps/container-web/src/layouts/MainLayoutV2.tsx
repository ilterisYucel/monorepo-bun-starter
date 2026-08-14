import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarV2 } from "./SidebarV2";
import type { PageTypeV2 } from "./SidebarV2.types";
import { SystemHeader } from "./SystemHeader";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useHvacData } from "../features/hvac";
import { useEnergyAnalyzerData } from "../features/energy-analyzer";
import * as S from "./MainLayout.styles";

interface MainLayoutV2Props {
  children: React.ReactNode;
  currentPage: PageTypeV2;
  onPageChange: (page: PageTypeV2) => void;
}

export const MainLayoutV2: React.FC<MainLayoutV2Props> = ({
  children,
  currentPage,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chargeStatus } = useChargeStatus();
  const { averages: hvacAvg } = useHvacData();
  const { summaries: eaSummaries } = useEnergyAnalyzerData();
  const totalActivePower = useMemo(
    () => eaSummaries.reduce((sum, s) => sum + s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower, 0),
    [eaSummaries],
  );

  useEffect(() => {
    const path = location.pathname.substring(1);
    if (path === "" || path === "dashboard") {
      onPageChange("dashboard");
    } else if (path === "bsc") {
      onPageChange("bsc");
    } else if (path === "fire") {
      onPageChange("fire");
    } else if (path === "energy-analyzer") {
      onPageChange("energy-analyzer");
    } else if (path === "hvac") {
      onPageChange("hvac");
    } else if (path === "control") {
      onPageChange("control");
    } else if (path === "events") {
      onPageChange("events");
    } else if (path === "system-charts") {
      onPageChange("system-charts");
    } else if (path === "reports") {
      onPageChange("reports");
    } else if (path === "devices") {
      onPageChange("devices");
    } else if (path === "analytics") {
      onPageChange("analytics");
    }
  }, [location, onPageChange]);

  const handlePageChange = (page: PageTypeV2) => {
    onPageChange(page);
    navigate(`/${page === "dashboard" ? "" : page}`);
  };

  return (
    <S.AppLayout>
      <SidebarV2
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
      <S.MainContent sidebarCollapsed $sidebarWidth={80}>
        <SystemHeader
          flowDirection={chargeStatus}
          powerConsumption={totalActivePower}
          ambientTemp={hvacAvg.avgCurrentTemp || undefined}
          ambientHumidity={hvacAvg.avgReturnHumidity || undefined}
        />
        <S.PageContent>{children}</S.PageContent>
      </S.MainContent>
    </S.AppLayout>
  );
};

MainLayoutV2.displayName = "MainLayoutV2";

export const LayoutWrapperV2: React.FC<{
  children: React.ReactNode;
  pageType: PageTypeV2;
}> = ({ children, pageType }) => {
  return (
    <MainLayoutV2 currentPage={pageType} onPageChange={() => {}}>
      {children}
    </MainLayoutV2>
  );
};

LayoutWrapperV2.displayName = "LayoutWrapperV2";
