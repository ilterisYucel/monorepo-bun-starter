import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { COLORS, SCADA_ICONS, ContainerConnectionBadge, useTranslation } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { useContainerTelemetry } from "../features/containers/hooks/useContainerTelemetry";
import { mockPcsList } from "../features/containers/services/mockDataGenerator";
import { PcsCard } from "../features/containers/components/PcsCard";

const BackIcon = SCADA_ICONS.collapse;
const BatteryIcon = SCADA_ICONS.battery;
const TempIcon = SCADA_ICONS.temperature;
const PowerIcon = SCADA_ICONS.powerPlug;
const HealthIcon = SCADA_ICONS.health;

const STATUS_KEY: Record<string, string> = {
  online: "status.active",
  warning: "status.warning",
  offline: "common.offline",
};

interface DeviceSummary {
  name: string;
  soc?: number;
  soh?: number;
  voltage?: number;
  current?: number;
  power?: number;
  temperature?: number;
  chargeStatus?: string;
  isClosed?: boolean;
  isTripped?: boolean;
  isOn?: boolean;
  dcVoltage?: number;
  dcCurrent?: number;
  dcPower?: number;
  roomCount?: number;
  avgRoomTemp?: number;
}

function deviceSummaries(telemetry: TelemetryData[]): DeviceSummary[] {
  const num = (deviceId: string, name: string): number | undefined =>
    telemetry.find((x) => x.deviceId === deviceId && x.name === name)?.value as number | undefined;
  const raw = (deviceId: string, name: string): unknown =>
    telemetry.find((x) => x.deviceId === deviceId && x.name === name)?.value;

  const bsc = ["BSC-1", "BSC-2"].map((id) => ({
    name: id,
    soc: num(id, "SOC"),
    soh: num(id, "SOH"),
    voltage: num(id, "Voltage"),
    current: num(id, "Current"),
    power: num(id, "Power"),
    temperature: num(id, "MaxCellTemperature"),
    chargeStatus: raw(id, "ChargeStatus") as string | undefined,
  }));

  const cb = ["CB-1", "CB-2"].map((id) => ({
    name: id,
    isClosed: raw(id, "Is Closed") as boolean | undefined,
    isTripped: raw(id, "Is Tripped") as boolean | undefined,
  }));

  const dc = ["DC-1", "DC-2"].map((id) => ({
    name: `DC-OUTPUT-${id.replace("DC-", "")}`,
    isOn: raw(id, "Is On") as boolean | undefined,
    dcVoltage: num(id, "Actual Voltage"),
    dcCurrent: num(id, "Actual Current"),
    dcPower: num(id, "Actual Power"),
    temperature: num(id, "Temperature"),
  }));

  const rooms = new Map<string, { temp: number }>();
  for (const x of telemetry) {
    if (x.deviceId !== "HVAC-KONTROL" || x.name !== "Room Temperature") continue;
    const roomId = x.tags?.room;
    if (roomId && !rooms.has(roomId)) rooms.set(roomId, { temp: x.value as number });
  }
  const roomTemps = Array.from(rooms.values()).map((r) => r.temp);
  const hvac = rooms.size > 0
    ? [{
        name: `HVAC (${rooms.size} oda)`,
        roomCount: rooms.size,
        avgRoomTemp: roomTemps.length > 0 ? roomTemps.reduce((a, b) => a + b, 0) / roomTemps.length : undefined,
      }]
    : [];

  return [...bsc, ...cb, ...dc, ...hvac];
}

const getDeviceStatusDot = (status: string, t: (k: string) => string) => {
  const color =
    status === "online"
      ? COLORS.success
      : status === "warning"
        ? COLORS.warning
        : COLORS.error;
  const text = t(STATUS_KEY[status] ?? status);
  return { color, text };
};

const DeviceCard: React.FC<{ device: DeviceSummary; status: string }> = ({ device, status }) => {
  const { t } = useTranslation();
  const dot = getDeviceStatusDot(status, t);

  const chargeStatusLabel =
    device.chargeStatus === "Charge"
      ? t("status.charging")
      : device.chargeStatus === "Discharge"
        ? t("status.discharging")
        : device.chargeStatus !== undefined
          ? t("status.idleMode")
          : undefined;

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dot.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, fontSize: "14px", color: COLORS.textWhite }}>
          {device.name}
        </span>
        <span style={{ fontSize: "11px", color: dot.color }}>{dot.text}</span>
        {chargeStatusLabel && (
          <span
            style={{
              fontSize: "11px",
              color: device.chargeStatus === "Charge" ? COLORS.success : COLORS.warning,
              marginLeft: "auto",
            }}
          >
            {chargeStatusLabel}
          </span>
        )}
      </div>

      {device.soc !== undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {[
            { label: "SoC", value: `%${Math.round(device.soc)}`, icon: BatteryIcon },
            { label: "SoH", value: `%${Math.round(device.soh ?? 0)}`, icon: HealthIcon },
            { label: t("device.voltage"), value: `${(device.voltage ?? 0).toFixed(1)}V` },
            { label: t("device.current"), value: `${(device.current ?? 0)}A` },
            { label: t("device.power"), value: `${(device.power ?? 0).toFixed(1)} kW`, icon: PowerIcon },
            { label: t("device.temperature"), value: `${(device.temperature ?? 0)}°C`, icon: TempIcon },
          ].map((m) => {
            const Ico = m.icon;
            return (
              <div
                key={m.label}
                style={{
                  background: COLORS.bgInput,
                  borderRadius: "8px",
                  padding: "8px 6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textWhite }}>
                  {Ico && <Ico size={12} />} {m.value}
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "2px" }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {device.isClosed !== undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div
            style={{
              padding: "10px",
              background: COLORS.bgInput,
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: device.isClosed ? COLORS.success : COLORS.error,
              }}
            >
              {device.isClosed ? t("status.closed") : t("status.open")}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("device.state")}</div>
          </div>
          <div
            style={{
              padding: "10px",
              background: COLORS.bgInput,
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: device.isTripped ? COLORS.error : COLORS.success,
              }}
            >
              {device.isTripped ? t("status.tripped") : t("status.normal")}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("container.trip")}</div>
          </div>
        </div>
      )}

      {device.isOn !== undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
          <div
            style={{
              padding: "10px",
              background: COLORS.bgInput,
              borderRadius: "8px",
              textAlign: "center",
              gridColumn: "1 / -1",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: device.isOn ? COLORS.success : COLORS.error,
              }}
            >
              {device.isOn ? t("status.open") : t("status.closed")}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("container.outputStatus")}</div>
          </div>
          {device.dcVoltage !== undefined && (
            <>
              <div style={{ padding: "8px", background: COLORS.bgInput, borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textWhite }}>
                  {device.dcVoltage.toFixed(1)}V
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("container.dcVoltage")}</div>
              </div>
              <div style={{ padding: "8px", background: COLORS.bgInput, borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textWhite }}>
                  {device.dcCurrent}A
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("container.dcCurrent")}</div>
              </div>
            </>
          )}
        </div>
      )}

      {device.roomCount !== undefined && (
        <div
          style={{
            padding: "10px",
            background: COLORS.bgInput,
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textWhite }}>
            {t("container.rooms", { count: String(device.roomCount), temp: device.avgRoomTemp?.toFixed(1) ?? "—" })}
          </div>
          <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{t("device.type.hvac")}</div>
        </div>
      )}
    </div>
  );
};

const PcsSection: React.FC<{ containerId: string }> = ({ containerId }) => {
  const pcs = mockPcsList().find((p) => p.containerId === containerId);
  if (!pcs) return null;
  return <PcsCard pcs={pcs} />;
};

export const ContainerDetailPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const { fieldId, containerId } = useParams<{ fieldId: string; containerId: string }>();
  const navigate = useNavigate();
  const { container } = useContainerTelemetry(containerId ?? "");

  if (!container) {
    return (
      <div style={{ padding: "20px", color: COLORS.error }}>
        {t("container.notFound")}: {containerId}
      </div>
    );
  }

  const devices = deviceSummaries(container.latestTelemetry);
  const soc = container.latestTelemetry.find(
    (t) => t.name === "SOC" && t.tags?.rack_id === "system",
  );
  const lastSeen = container.connected
    ? new Date().toLocaleString(loc, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => navigate(`/field/${fieldId}/containers`)}
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
          {container.name}
        </h2>
        <ContainerConnectionBadge
          connected={container.connected}
          label={t("container.connected")}
          size="small"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {[
          {
            label: "SoC",
            value: soc ? `%${Math.round(soc.value as number)}` : "—",
          },
          {
            label: t("device.state"),
            value: t(STATUS_KEY[container.status] ?? container.status),
          },
          {
            label: t("container.devices"),
            value: `${container.connected ? `${devices.length}/${devices.length}` : `0/${devices.length}`}`,
          },
          {
            label: t("container.lastSeen"),
            value: lastSeen,
          },
        ].map((g) => (
          <div
            key={g.label}
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 700, color: COLORS.textWhite }}>
              {g.value}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "2px" }}>
              {g.label}
            </div>
          </div>
        ))}
      </div>

      <PcsSection containerId={container.containerId} />

      <div style={{ fontSize: "12px", fontWeight: 600, color: COLORS.textMuted, marginBottom: "10px" }}>
        {t("container.devices")}
      </div>

      {devices.map((d) => (
        <DeviceCard key={d.name} device={d} status={container.status} />
      ))}
    </div>
  );
};
