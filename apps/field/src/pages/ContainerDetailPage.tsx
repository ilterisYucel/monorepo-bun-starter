import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { COLORS, SCADA_ICONS, ContainerConnectionBadge } from "@gd-monorepo/ui";
import { useContainerTelemetry } from "../features/containers/hooks/useContainerTelemetry";

const BackIcon = SCADA_ICONS.collapse;
const BatteryIcon = SCADA_ICONS.battery;
const TempIcon = SCADA_ICONS.temperature;
const PowerIcon = SCADA_ICONS.powerPlug;
const HealthIcon = SCADA_ICONS.health;

const STATUS_LABEL: Record<string, string> = {
  online: "Aktif",
  warning: "Uyarı",
  offline: "Çevrimdışı",
};

const getDeviceStatusDot = (status: string) => {
  const color =
    status === "online"
      ? COLORS.success
      : status === "warning"
        ? COLORS.warning
        : COLORS.error;
  const text = STATUS_LABEL[status] ?? status;
  return { color, text };
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

function deviceSummaries(containerId: string, status: string): DeviceSummary[] {
  if (status === "offline") {
    return [
      { name: "BSC-1" }, { name: "BSC-2" },
      { name: "CB-1" }, { name: "CB-2" },
      { name: "DC-OUTPUT-1" }, { name: "DC-OUTPUT-2" },
      { name: "HVAC (4 oda)", roomCount: 4 },
    ];
  }

  if (containerId === "container-1") {
    return [
      { name: "BSC-1", soc: 82, soh: 95, voltage: 48.2, current: 258, power: 12.4, temperature: 38, chargeStatus: "Şarj Oluyor" },
      { name: "BSC-2", soc: 78, soh: 93, voltage: 48.0, current: 245, power: 11.8, temperature: 36, chargeStatus: "Şarj Oluyor" },
      { name: "CB-1", isClosed: true, isTripped: false },
      { name: "CB-2", isClosed: true, isTripped: false },
      { name: "DC-OUTPUT-1", isOn: true, dcVoltage: 48.0, dcCurrent: 120, dcPower: 5.76, temperature: 35 },
      { name: "DC-OUTPUT-2", isOn: true, dcVoltage: 47.8, dcCurrent: 105, dcPower: 5.02, temperature: 34 },
      { name: "HVAC (4 oda)", roomCount: 4, avgRoomTemp: 22.5 },
    ];
  }

  if (containerId === "container-2") {
    return [
      { name: "BSC-1", soc: 65, soh: 88, voltage: 46.8, current: 173, power: 8.1, temperature: 42, chargeStatus: "Deşarj Oluyor" },
      { name: "BSC-2", soc: 60, soh: 86, voltage: 46.5, current: 165, power: 7.7, temperature: 40, chargeStatus: "Deşarj Oluyor" },
      { name: "CB-1", isClosed: true, isTripped: false },
      { name: "CB-2", isClosed: false, isTripped: true },
      { name: "DC-OUTPUT-1", isOn: false, dcVoltage: 0, dcCurrent: 0, dcPower: 0, temperature: 28 },
      { name: "DC-OUTPUT-2", isOn: true, dcVoltage: 47.0, dcCurrent: 90, dcPower: 4.23, temperature: 33 },
      { name: "HVAC (4 oda)", roomCount: 4, avgRoomTemp: 25.0 },
    ];
  }

  return [];
}

const DeviceCard: React.FC<{ device: DeviceSummary; status: string }> = ({ device, status }) => {
  const dot = getDeviceStatusDot(device.name.startsWith("CB") && device.isTripped ? "warning" : status);

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: dot.color,
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.textWhite }}>
            {device.name}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: dot.color }}>{dot.text}</span>
      </div>

      {device.soc !== undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {[
            { label: "SoC", value: `%${Math.round(device.soc)}`, icon: BatteryIcon },
            { label: "SoH", value: `%${Math.round(device.soh ?? 0)}`, icon: HealthIcon },
            { label: "Voltaj", value: `${(device.voltage ?? 0).toFixed(1)}V` },
            { label: "Akım", value: `${(device.current ?? 0)}A` },
            { label: "Güç", value: `${(device.power ?? 0).toFixed(1)} kW`, icon: PowerIcon },
            { label: "Sıcaklık", value: `${(device.temperature ?? 0)}°C`, icon: TempIcon },
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
              {device.isClosed ? "Kapalı" : "Açık"}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>Durum</div>
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
              {device.isTripped ? "Atmış" : "Normal"}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>Trip</div>
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
              {device.isOn ? "Açık" : "Kapalı"}
            </div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>Çıkış Durumu</div>
          </div>
          {device.dcVoltage !== undefined && (
            <>
              <div style={{ padding: "8px", background: COLORS.bgInput, borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textWhite }}>
                  {device.dcVoltage.toFixed(1)}V
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textMuted }}>DC Voltaj</div>
              </div>
              <div style={{ padding: "8px", background: COLORS.bgInput, borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textWhite }}>
                  {device.dcCurrent}A
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textMuted }}>DC Akım</div>
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
            {device.roomCount} oda — Ort. {device.avgRoomTemp?.toFixed(1) ?? "—"}°C
          </div>
          <div style={{ fontSize: "10px", color: COLORS.textMuted }}>HVAC</div>
        </div>
      )}
    </div>
  );
};

export const ContainerDetailPage: React.FC = () => {
  const { fieldId, containerId } = useParams<{ fieldId: string; containerId: string }>();
  const navigate = useNavigate();
  const { container } = useContainerTelemetry(containerId ?? "");

  if (!container) {
    return (
      <div style={{ padding: "20px", color: COLORS.error }}>
        Konteyner bulunamadı: {containerId}
      </div>
    );
  }

  const devices = deviceSummaries(container.containerId, container.status);
  const soc = container.latestTelemetry.find(
    (t) => t.name === "SOC" && t.tags?.rack_id === "system",
  );

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
          label="PPC: Bağlı"
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
            label: "Durum",
            value: STATUS_LABEL[container.status] ?? container.status,
          },
          {
            label: "Cihaz",
            value: `${container.connected ? "13/13" : "0/13"}`,
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

      <div style={{ fontSize: "12px", fontWeight: 600, color: COLORS.textMuted, marginBottom: "10px" }}>
        Cihazlar
      </div>

      {devices.map((d) => (
        <DeviceCard key={d.name} device={d} status={container.status} />
      ))}
    </div>
  );
};
