import React from "react";
import { useDevicesStore } from "../stores/devicesStore";
import type { DeviceInfo } from "../features/devices/types/device";

const statusColor = (status: string): string =>
  status === "online" ? "#10b981" : "#ef4444";

const typeLabel = (device: DeviceInfo): string =>
  device.type || "-";

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    color: "#e5e7eb",
    fontFamily: "monospace",
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "20px",
    color: "#f9fafb",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    background: "#1a1a2e",
    borderRadius: "12px",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    borderBottom: "1px solid #2a2a3a",
    color: "#9ca3af",
    fontWeight: 600,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: {
    padding: "10px 16px",
    borderBottom: "1px solid #1f1f2e",
    color: "#d1d5db",
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
    color: "#6b7280",
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
                <span style={{ ...styles.badge, background: "#3b82f620", color: "#3b82f6" }}>
                  {typeLabel(device)}
                </span>
              </td>
              <td style={styles.td}>{device.protocol}</td>
              <td style={styles.td}>{device.rack_count ?? "-"}</td>
              <td style={styles.td}>{device.model ?? "-"}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: device.status === "online" ? "#10b98120" : "#ef444420", color: statusColor(device.status) }}>
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
