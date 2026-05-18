// src/pages/RacksDetailPage/RacksDetailPage.tsx
import React, { useState } from "react";
import { useRacks, RackCard } from "../../modules/racks";
import { useChargeStatus } from "../../modules/telemetry/hooks/useChargeStatus";
import { TelemetryChart } from "../../components/TelemetryChart/TelemetryChart";
import "./styles.css";

export const RacksDetailPage: React.FC = () => {
  const { racks, isLoading } = useRacks("Idle");
  const [selectedRackId, setSelectedRackId] = useState<number>(1);

  // 🔥 Güncel charge status
  const { chargeStatus } = useChargeStatus();

  // Seçili rack'i bul
  const selectedRack = racks.find((r) => r.id === selectedRackId);
  const selectedRackName = selectedRack?.name || `Rack ${selectedRackId}`;

  const telemetryNames = [
    "Voltage",
    "Current",
    "Power",
    "Temperature",
    "SoC",
    "SoH",
  ];

  if (isLoading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="racks-detail-page">
      <div className="detail-header">
        <div className="detail-controls">
          <select
            value={selectedRackId}
            onChange={(e) => setSelectedRackId(Number(e.target.value))}
          >
            {racks.map((rack) => (
              <option key={rack.id} value={rack.id}>
                {rack.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="racks-detail-content">
        <div className="rack-card-wrapper">
          {selectedRack && (
            <RackCard
              {...selectedRack}
              charge_status={chargeStatus} // 🔥 Güncel charge status'i geç
            />
          )}
        </div>
        <div className="rack-chart-wrapper">
          <TelemetryChart
            telemetryNames={telemetryNames}
            title={`${selectedRackName} - Tarihsel Veriler`}
            yAxisLabel="Değer"
            height={400}
            defaultRange="1h"
            defaultPoints={120}
          />
        </div>
      </div>
    </div>
  );
};
