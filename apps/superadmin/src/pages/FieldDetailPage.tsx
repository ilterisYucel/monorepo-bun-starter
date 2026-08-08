import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  COLORS,
  SCADA_ICONS,
  ContainerConnectionBadge,
  useTranslation,
} from "@gd-monorepo/ui";

const BackIcon = SCADA_ICONS.collapse;
const RefreshIcon = SCADA_ICONS.refresh;

// ELEGANT-EXCEPTION: mock data for initial scaffolding
const MOCK_CONTAINERS = [
  { id: "cont-1", label: "Konteyner 1", connected: true },
  { id: "cont-2", label: "Konteyner 2", connected: true },
  { id: "cont-3", label: "Konteyner 3", connected: false },
  { id: "cont-4", label: "Konteyner 4", connected: true },
];

export const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          borderBottom: `1px solid ${COLORS.borderDefault}`,
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
            transform: "rotate(180deg)",
          }}
        >
          <BackIcon size={18} />
        </button>
        <h2 style={{ flex: 1, fontSize: "16px", color: COLORS.textWhite }}>
          {id ?? t("field.title")}
        </h2>
        <button
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <RefreshIcon size={16} />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "10px",
          padding: "14px 16px",
        }}
      >
        {[
          { label: t("container.totalPower"), value: "12.4 MW" },
          { label: t("dashboard.avgSoc"), value: "%82" },
          { label: t("container.title"), value: "4/4" },
          { label: t("container.alarm"), value: "0" },
        ].map((g) => (
          <div
            key={g.label}
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "12px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: COLORS.textMuted, marginBottom: "4px" }}>
              {g.label}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: COLORS.textWhite }}>
              {g.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: COLORS.textMuted,
            marginBottom: "8px",
          }}
        >
          {t("boss.sectionContainers")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {MOCK_CONTAINERS.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "13px", color: COLORS.textPrimary }}>
                {c.label}
              </span>
              <ContainerConnectionBadge
                connected={c.connected}
                label={c.connected ? t("status.connected") : t("status.disconnected")}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
