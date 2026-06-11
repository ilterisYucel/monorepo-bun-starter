// apps/web/src/features/control/ControlPage.tsx
import React from "react";

import "./ControlPage.css";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { ControlPanel } from "../features/control/components/ControlPanel";
import { Scheduler } from "../features/control/components/Scheduler";

export const ControlPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();

  const handleCommandSent = () => {
    // Komut gönderildi - state'ler zaten hook içinde güncelleniyor
  };

  return (
    <div className="control-page">
      <div className="control-grid">
        <div className="control-panel-card">
          <ControlPanel
            currentChargeStatus={chargeStatus}
            onCommandSent={handleCommandSent}
          />
        </div>
        <div className="scheduler-card">
          <Scheduler />
        </div>
      </div>
    </div>
  );
};
