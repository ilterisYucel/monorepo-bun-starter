// apps/web/src/features/racks/RacksPage.tsx
import React from "react";

import "./RacksPage.css";
import { useChargeStatus } from "../hooks/useChargeStatus";
import { useRacksData } from "../features/racks/hooks/useRacksData";
import { RackRow } from "../features/racks/components/RackRow";

export const RacksPage: React.FC = () => {
  const { chargeStatus } = useChargeStatus();
  const { racks, isLoading } = useRacksData(chargeStatus);

  if (isLoading) {
    return (
      <div className="racks-loading">
        <div className="spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="racks-page">
      <div className="racks-list">
        {racks.map((rack) => (
          <RackRow key={rack.id} rack={rack} chargeStatus={chargeStatus} />
        ))}
      </div>
    </div>
  );
};
