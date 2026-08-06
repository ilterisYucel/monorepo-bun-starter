import React from "react";
import { useNavigate } from "react-router-dom";
import { FieldMap, FieldCard, COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import type { FieldMarker } from "@gd-monorepo/ui";

const MOCK_FIELDS: FieldMarker[] = [
  {
    id: "field-1",
    name: "Solar Park 1",
    lat: 38.5,
    lng: 33.0,
    status: "online",
    containerCount: 4,
    onlineContainerCount: 4,
    totalPowerMw: 12.4,
    avgSoc: 82,
    activeAlarms: 0,
  },
  {
    id: "field-2",
    name: "Ruzgar Sahasi 2",
    lat: 39.2,
    lng: 35.5,
    status: "warning",
    containerCount: 4,
    onlineContainerCount: 3,
    totalPowerMw: 8.1,
    avgSoc: 65,
    activeAlarms: 2,
  },
  {
    id: "field-3",
    name: "Hidro Park 3",
    lat: 37.0,
    lng: 37.5,
    status: "offline",
    containerCount: 2,
    onlineContainerCount: 0,
    totalPowerMw: 0,
    avgSoc: 0,
    activeAlarms: 0,
  },
];

const RefreshIcon = SCADA_ICONS.refresh;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ height: "38vh", minHeight: "240px" }}>
        <FieldMap
          fields={MOCK_FIELDS}
          onFieldClick={(id) => navigate(`/fields/${id}`)}
          height="100%"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 8px",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "15px", color: COLORS.textWhite }}>
          Sahalar ({MOCK_FIELDS.length})
        </span>
        <button
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <RefreshIcon size={18} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 16px" }}>
        {MOCK_FIELDS.map((f) => (
          <FieldCard
            key={f.id}
            field={f}
            size="small"
            onClick={() => navigate(`/fields/${f.id}`)}
          />
        ))}
      </div>
    </div>
  );
};
