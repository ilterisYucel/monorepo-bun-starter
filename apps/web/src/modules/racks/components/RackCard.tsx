// src/modules/racks/components/RackCard.tsx
import React from "react";
import { formatTelemetryValue } from "../../../utils/formatHelpers";
import "./RackCard.css";

export interface RackCardProps {
  id: number;
  name: string;
  status: string;
  charge_status: "Charge" | "Discharge" | "Idle";
  soc: number | null;
  soh?: number | null;
  voltage: number | null;
  current: number | null;
  power_kw: number | null;
  temperature: number | null;
}

const getStatusColor = (status: string) =>
  status === "online" ? "badge-online" : "badge-offline";

const getChargeStatusClass = (chargeStatus: string) => {
  if (chargeStatus === "Charge") return "badge-charge";
  if (chargeStatus === "Discharge") return "badge-discharge";
  return "badge-idle";
};

const formatValue = (
  value: number | null,
  unit: string,
  decimals: number = 1,
): string => {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(decimals)} ${unit}`;
};

export const RackCard: React.FC<RackCardProps> = ({
  name,
  status,
  charge_status,
  soc,
  soh,
  voltage,
  current,
  power_kw,
  temperature,
}) => {
  return (
    <div className="rack-card">
      {/* Header */}
      <div className="rack-card-header">
        <span className="rack-name">{name}</span>
        <div className="rack-badges">
          <span className={`badge ${getStatusColor(status)}`}>
            {status === "online" ? "🟢 Çevrimiçi" : "🔴 Çevrimdışı"}
          </span>
          <span className={`badge ${getChargeStatusClass(charge_status)}`}>
            {charge_status === "Charge" && "🔋 Şarj Oluyor"}
            {charge_status === "Discharge" && "⚡ Deşarj Oluyor"}
            {charge_status === "Idle" && "⏸️ Beklemede"}
          </span>
        </div>
      </div>

      {/* SoC - Büyük ve belirgin */}
      <div className="rack-soc">
        <div className="soc-value">
          {formatTelemetryValue(soc as number) ?? "N/A"}%
        </div>
        <div className="soc-label">Şarj Durumu (SoC)</div>
        <div className="soc-bar">
          <div
            className="soc-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, soc || 0))}%` }}
          />
        </div>
      </div>

      {/* Detaylar Grid - 2 sütun */}
      <div className="rack-details-grid">
        <div className="detail-item">
          <span className="detail-icon">🔋</span>
          <span className="detail-label">Voltaj</span>
          <span className="detail-value">{formatValue(voltage, "V")}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">⚡</span>
          <span className="detail-label">Akım</span>
          <span className="detail-value">{formatValue(current, "A")}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">💪</span>
          <span className="detail-label">Güç</span>
          <span className="detail-value">{formatValue(power_kw, "kW")}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">🌡️</span>
          <span className="detail-label">Sıcaklık</span>
          <span className="detail-value">{formatValue(temperature, "°C")}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">💚</span>
          <span className="detail-label">Sağlık (SoH)</span>
          <span className="detail-value">
            {formatValue(soh !== undefined ? soh : null, "%")}
          </span>
        </div>
      </div>
    </div>
  );
};
