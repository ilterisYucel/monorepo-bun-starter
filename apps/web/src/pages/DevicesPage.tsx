import React from "react";
import { useDevicesStore } from "../stores/devicesStore";
import type { DeviceInfo } from "../features/devices/types/device";
import { COLORS } from "@gd-monorepo/ui";

const statusColor = (status: string): string =>
  status === "online" ? COLORS.success : COLORS.error;

const typeLabel = (device: DeviceInfo): string =>
  device.type || "-";

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    color: COLORS.textPrimary,
    fontFamily: "monospace",
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "20px",
    color: COLORS.bgCodeLight,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    background: COLORS.bgCard,
    borderRadius: "12px",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    borderBottom: `1px solid ${COLORS.borderDefault}`,
    color: COLORS.textMuted,
    fontWeight: 600,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: {
    padding: "10px 16px",
    borderBottom: `1px solid ${COLORS.bgPopup}`,
    color: COLORS.textLight,
  },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    color: COLORS.textDisabled,
  },
};

export const DevicesPage: React.FC = () => {
  const { devices, loaded, loading } = useDevicesStore();

  if (loading || !loaded) {
    return <div style={styles.loading}>Yukleniyor...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Cihaz Listesi</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Ad</th>
            <th style={styles.th}>Tip</th>
            <th style={styles.th}>Protokol</th>
            <th style={styles.th}>Rack</th>
            <th style={styles.th}>Model</th>
            <th style={styles.th}>Durum</th>
            <th style={styles.th}>Poll (ms)</th>
            <th style={styles.th}>Son Gorulme</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td style={styles.td}><code>{device.id}</code></td>
              <td style={styles.td}>{device.name}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: COLORS.infoAlpha12, color: COLORS.info }}>
                  {typeLabel(device)}
                </span>
              </td>
              <td style={styles.td}>{device.protocol}</td>
              <td style={styles.td}>{device.rack_count ?? "-"}</td>
              <td style={styles.td}>{device.model ?? "-"}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: device.status === "online" ? COLORS.successAlpha12 : COLORS.errorAlpha12, color: statusColor(device.status) }}>
                  {device.status}
                </span>
              </td>
              <td style={styles.td}>{device.poll_interval_ms ?? "-"}</td>
              <td style={styles.td}>{device.last_seen ? new Date(device.last_seen).toLocaleString("tr-TR") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
