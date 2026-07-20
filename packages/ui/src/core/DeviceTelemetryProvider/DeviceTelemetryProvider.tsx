import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useRealtimeTelemetry } from "../../hooks/useRealtimeTelemetry";
import type { TelemetryEntry } from "../../hooks/useRealtimeTelemetry";
import type {
  DeviceTelemetryProviderProps,
  DeviceTelemetryContextValue,
} from "./DeviceTelemetryProvider.types";

const DeviceTelemetryContext = createContext<DeviceTelemetryContextValue | null>(null);

function useDeviceTelemetryContext(): DeviceTelemetryContextValue {
  const ctx = useContext(DeviceTelemetryContext);
  if (!ctx) {
    throw new Error(
      "DeviceTelemetryProvider sub-components must be used within a <DeviceTelemetryProvider>",
    );
  }
  return ctx;
}

export function DeviceTelemetryProvider({
  deviceId,
  transport,
  bufferSize = 200,
  children,
}: DeviceTelemetryProviderProps) {
  const { data, isConnected, error } = useRealtimeTelemetry({
    transport,
    deviceId,
    bufferSize,
    enabled: deviceId !== "",
  });

  const metric = useCallback(
    (name: string) => {
      for (let i = data.length - 1; i >= 0; i--) {
        const entry = data[i] as TelemetryEntry;
        if (entry.name === name) {
          return { value: entry.value, unit: entry.unit, timestamp: entry.timestamp };
        }
      }
      return undefined;
    },
    [data],
  );

  const value = useMemo<DeviceTelemetryContextValue>(
    () => ({ deviceId, isConnected, error, metric }),
    [deviceId, isConnected, error, metric],
  );

  return (
    <DeviceTelemetryContext.Provider value={value}>
      {children}
    </DeviceTelemetryContext.Provider>
  );
}

function Gauge({ metric: metricName, label }: { metric: string; label?: string }) {
  const ctx = useDeviceTelemetryContext();
  const m = ctx.metric(metricName);

  if (!m) {
    return (
      <div style={{ padding: "12px", borderRadius: "8px", background: "var(--bg-card, #1a1a2e)", fontSize: 12, color: "#6b7280" }}>
        {label ?? metricName}: —
      </div>
    );
  }

  const valueStr =
    typeof m.value === "number" ? m.value.toFixed(2) : String(m.value);

  return (
    <div style={{ padding: "12px", borderRadius: "8px", background: "var(--bg-card, #1a1a2e)", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label ?? metricName}</div>
      <div style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: "#e0e0e0" }}>
        {valueStr}
        <span style={{ fontSize: 12, marginLeft: 4, color: "#6b7280" }}>{m.unit}</span>
      </div>
    </div>
  );
}

function StatusBadge() {
  const ctx = useDeviceTelemetryContext();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "8px", background: "var(--bg-card, #1a1a2e)" }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: ctx.isConnected ? "#10b981" : "#ef4444",
          boxShadow: ctx.isConnected ? "0 0 6px #10b981" : "0 0 6px #ef4444",
        }}
      />
      <span style={{ fontSize: 12, color: "#9ca3af" }}>
        {ctx.isConnected ? "Connected" : ctx.error ? `Error: ${ctx.error}` : "Disconnected"}
      </span>
    </div>
  );
}

DeviceTelemetryProvider.Gauge = Gauge;
DeviceTelemetryProvider.StatusBadge = StatusBadge;

DeviceTelemetryProvider.displayName = "DeviceTelemetryProvider";
