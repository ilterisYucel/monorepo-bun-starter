// apps/web/src/features/dashboard/components/SystemGaugesGroup.tsx
import React from "react";
import type { Averages } from "../hooks/useDashboardData";
import { SystemGauges } from "./SystemGauges";
import "./SystemGaugesGroup.css";

interface SystemGaugesGroupProps {
  bscData: Averages[];
}

export const SystemGaugesGroup: React.FC<SystemGaugesGroupProps> = ({
  bscData,
}) => {
  return (
    <div className="gauges-group">
      {bscData.map((averages, index) => (
        <div key={index} className="gauges-group-row">
          <div className="gauges-bsc-label">BSC {index + 1}</div>
          <SystemGauges averages={averages} />
        </div>
      ))}
    </div>
  );
};
