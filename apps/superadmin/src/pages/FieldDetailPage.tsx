import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  COLORS,
  SCADA_ICONS,
  SummaryCard,
  ContainerConnectionBadge,
  useTranslation,
} from "@gd-monorepo/ui";
import { useField, useDeleteField } from "../features/fields/hooks/useAdminFields";
import { toFieldMarker } from "../features/fields/mappers";
import { FieldRemoteFrame } from "../features/fields/components/FieldRemoteFrame";

const BackIcon = SCADA_ICONS.collapse;
const PowerIcon = SCADA_ICONS.powerPlug;
const BatteryIcon = SCADA_ICONS.battery;
const ContainerIcon = SCADA_ICONS.container;
const WarningIcon = SCADA_ICONS.logWarning;
const EditIcon = SCADA_ICONS.edit;
const TrashIcon = SCADA_ICONS.trash;

const formatMw = (value?: number | null) =>
  value === undefined || value === null ? "—" : `${value.toFixed(1)} MW`;
const formatSoc = (value?: number | null) =>
  value === undefined || value === null ? "—" : `%${Math.round(value)}`;

/**
 * Saha Detay (BOSS-UYGULAMA-MIMARISI.md §4.2) — FieldPoller satırından özet;
 * "Field Uygulamasını Aç" Faz 3'te uplink tüneliyle bağlanır.
 */
export const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: field, isLoading } = useField(id);
  const deleteField = useDeleteField();
  const [remoteOpen, setRemoteOpen] = React.useState(false);

  const marker = field ? toFieldMarker(field) : undefined;
  const lastSeen = field?.last_seen_at
    ? new Date(field.last_seen_at).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

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
          onClick={() => navigate("/fields")}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
            transform: "rotate(180deg)",
          }}
          aria-label="back"
        >
          <BackIcon size={18} />
        </button>
        <div
          style={{
            flex: 1,
            fontSize: "14px",
            fontWeight: 700,
            color: COLORS.textWhite,
          }}
        >
          {isLoading ? "..." : (field?.name ?? id ?? t("boss.fieldDetail"))}
        </div>
        <ContainerConnectionBadge
          connected={field?.status === "online"}
          label={
            field?.status === "online" ? t("boss.status.online") : t("boss.status.offline")
          }
          size="small"
        />
        {lastSeen && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "999px",
              fontSize: "11px",
              color: COLORS.textMuted,
              whiteSpace: "nowrap",
            }}
          >
            {t("boss.lastSeen")}: {lastSeen}
          </span>
        )}
        <button
          onClick={() => {
            if (id) setRemoteOpen(true);
          }}
          style={{
            background: COLORS.infoAlpha12,
            border: `1px solid ${COLORS.info}`,
            borderRadius: "6px",
            color: COLORS.textWhite,
            padding: "6px 14px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {t("boss.fieldAppOpen")}
        </button>
        <button
          onClick={() => navigate(`/fields?edit=${id ?? ""}`)}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
          }}
          aria-label={t("boss.edit")}
        >
          <EditIcon size={16} />
        </button>
        <button
          onClick={() => {
            if (id) void deleteField.mutateAsync(id).then(() => navigate("/fields"));
          }}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.error,
            cursor: "pointer",
            padding: "4px",
          }}
          aria-label={t("boss.delete")}
        >
          <TrashIcon size={16} />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          padding: "14px 16px",
        }}
      >
        <SummaryCard
          icon={<PowerIcon size={16} />}
          label={t("container.totalPower")}
          value={formatMw(field?.total_power_mw)}
          variant="info"
        />
        <SummaryCard
          icon={<BatteryIcon size={16} />}
          label={t("dashboard.avgSoc")}
          value={formatSoc(field?.avg_soc)}
          variant="bsc"
        />
        <SummaryCard
          icon={<ContainerIcon size={16} />}
          label={t("container.title")}
          value={`${field?.online_containers ?? 0}/${field?.container_count ?? 0}`}
          variant={marker?.status === "online" ? "ok" : "fault"}
        />
        <SummaryCard
          icon={<WarningIcon size={16} />}
          label={t("container.alarm")}
          value={String(field?.active_alarms ?? 0)}
          variant={field?.active_alarms ? "alarm" : "ok"}
        />
      </div>

      {remoteOpen && id && (
        <FieldRemoteFrame
          fieldId={id}
          fieldName={field?.name}
          onClose={() => setRemoteOpen(false)}
        />
      )}
    </div>
  );
};
