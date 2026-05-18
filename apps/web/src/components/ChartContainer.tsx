import React from "react";
import { VoltageChart } from "./VoltageChart";
import { CurrentChart } from "./CurrentChart";
import type { HistoricalDataPoint } from "../types";

interface ChartsContainerProps {
  voltageData: HistoricalDataPoint[];
  currentData: HistoricalDataPoint[];
  isLoading?: boolean;
}

export const ChartsContainer: React.FC<ChartsContainerProps> = ({
  voltageData,
  currentData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#1f1f2e",
            borderRadius: "12px",
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#6b7280" }}>Yükleniyor...</p>
        </div>
        <div
          style={{
            flex: 1,
            background: "#1f1f2e",
            borderRadius: "12px",
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#6b7280" }}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        flexWrap: "wrap",
        marginBottom: "24px",
      }}
    >
      <div style={{ flex: 1, minWidth: "300px" }}>
        <VoltageChart data={voltageData} height={300} />
      </div>
      <div style={{ flex: 1, minWidth: "300px" }}>
        <CurrentChart data={currentData} height={300} />
      </div>
    </div>
  );
};
