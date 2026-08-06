import React from "react";
import { useParams } from "react-router-dom";
import { COLORS } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";

export const FieldDashboardPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers } = useContainerData(fieldId ?? "");

  const totalPower = containers.reduce(
    (sum, c) => sum + (c.powerKw ?? 0),
    0,
  );

  const avgSoc =
    containers.length > 0
      ? containers.reduce((sum, c) => sum + (c.soc ?? 0), 0) / containers.length
      : 0;

  const onlineContainers = containers.filter((c) => c.connected).length;
  const totalContainers = containers.length;

  const offlineCount = containers.filter((c) => c.status === "offline").length;

  return (
    <div>
      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "14px",
          padding: "22px 28px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.info }}>
            {totalPower.toFixed(1)} <span style={{ fontSize: "14px", color: COLORS.textMuted }}>MW</span>
          </div>
          <div style={{ fontSize: "11px", color: COLORS.textMuted }}>Toplam Güç</div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.success }}>
            %{Math.round(avgSoc)}
          </div>
          <div style={{ fontSize: "11px", color: COLORS.textMuted }}>Ort. SoC</div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.textWhite }}>
            {onlineContainers}/{totalContainers}
          </div>
          <div style={{ fontSize: "11px", color: COLORS.textMuted }}>Konteyner</div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: offlineCount > 0 ? COLORS.error : COLORS.textMuted,
            }}
          >
            {offlineCount}
          </div>
          <div style={{ fontSize: "11px", color: COLORS.textMuted }}>Alarm</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
        }}
      >
        {containers.map((c) => (
          <div
            key={c.containerId}
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    c.status === "online"
                      ? COLORS.success
                      : c.status === "warning"
                        ? COLORS.warning
                        : COLORS.error,
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.textWhite }}>
                {c.name}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
                SoC
              </div>
              <div style={{ fontSize: "11px", color: COLORS.textPrimary, textAlign: "right" }}>
                %{c.soc !== undefined ? Math.round(c.soc) : "—"}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
                Güç
              </div>
              <div style={{ fontSize: "11px", color: COLORS.textPrimary, textAlign: "right" }}>
                {c.powerKw !== undefined ? `${c.powerKw.toFixed(1)} kW` : "—"}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
                Durum
              </div>
              <div style={{ fontSize: "11px", color: c.connected ? COLORS.success : COLORS.error, textAlign: "right" }}>
                {c.connected ? "Bağlı" : "Bağlantı Yok"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
