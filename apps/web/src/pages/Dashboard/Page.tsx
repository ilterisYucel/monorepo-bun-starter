// src/pages/DashboardPage/DashboardPage.tsx
import React from "react";
import { useHistoricalData } from "../../modules/telemetry";
import { useRacks } from "../../modules/racks";
import { PowerFlowAnimation } from "../../components/PowerFlowAnimation/PowerFlowAnimation";
import { ControlPanel } from "../../modules/control";
import { Gauge } from "../../ui/Gauge";
import { TelemetryChart } from "../../components/TelemetryChart/TelemetryChart";
import "./style.css";
import { useChargeStatus } from "../../modules/telemetry/hooks/useChargeStatus";
import { LogTerminal } from "../../components/LogTerminal/LogTerminal";

export const DashboardPage: React.FC = () => {
  // Telemetry modülünden
  const { refetch: refetchHistory } = useHistoricalData(1);
  const { chargeStatus } = useChargeStatus(); // ✅ Artık anında güncelleniyor!
  const telemetryNames = ["Voltage", "Current", "Power", "SoC"];

  // Racks modülünden
  const { racks, averages, isLoading: isRacksLoading } = useRacks(chargeStatus);

  // Komut gönderildikten sonra verileri yenile
  const handleCommandSent = () => {
    refetchHistory();
  };

  if (isRacksLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Gauge'ler - Yatay */}
      <div className="gauges-row">
        <Gauge
          value={averages.avgSoC}
          label="Ortalama SoC"
          unit="%"
          color="#10b981"
          icon="🔋"
        />
        <Gauge
          value={averages.avgSoH}
          label="Ortalama SoH"
          unit="%"
          color="#8b5cf6"
          icon="💪"
        />
        <Gauge
          value={averages.avgPower}
          max={500}
          label="Sistem Gücü"
          unit="kW"
          color="#f59e0b"
          icon="⚡"
        />
        <Gauge
          value={averages.avgVoltage}
          max={2000}
          label="Sistem Voltajı"
          unit="V"
          color="#3b82f6"
          icon="🔌"
        />
        <Gauge
          value={averages.avgCurrent}
          max={500}
          label="Sistem Akımı"
          unit="A"
          color="#ef4444"
          icon="🌊"
        />
      </div>

      {/* Animasyon (80%) + Control Panel (20%) */}
      <div className="dashboard-middle">
        <div className="powerflow-wrapper">
          <PowerFlowAnimation
            flowDirection={chargeStatus}
            racks={racks}
            height={200}
          />
        </div>
        <div className="control-wrapper">
          <ControlPanel
            currentChargeStatus={chargeStatus}
            onCommandSent={handleCommandSent}
          />
        </div>
      </div>

      {/* 🔥 TelemetryChart (70%) + LogTerminal (30%) */}
      <div className="dashboard-bottom">
        <div className="chart-wrapper-bottom">
          <TelemetryChart
            telemetryNames={telemetryNames}
            title="📊 Sistem Ölçümleri"
            yAxisLabel="Değer"
            height={320}
            colors={["#3b82f6", "#f59e0b", "#10b981", "#ef4444"]}
            defaultRange="1h"
            defaultPoints={120}
          />
        </div>
        <div className="log-wrapper-bottom">
          <LogTerminal maxHeight={360} />
        </div>
      </div>
    </div>
  );
};
