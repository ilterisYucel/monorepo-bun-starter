// apps/web/src/features/dashboard/DashboardPage.tsx
import React from "react";
import { PowerFlowAnimation } from "@gd-monorepo/ui";

import "./DashboardPage.css";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useDashboardData } from "../features/dashboard/hooks/useDashboardData";
import { SystemGauges } from "../features/dashboard/components/SystemGauges";

export const DashboardPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, averages, isLoading } = useDashboardData(chargeStatus);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <SystemGauges averages={averages} />
      <div className="powerflow-wrapper">
        <PowerFlowAnimation
          flowDirection={chargeStatus}
          racks={racks}
          height={300}
        />
      </div>
    </div>
  );
};
