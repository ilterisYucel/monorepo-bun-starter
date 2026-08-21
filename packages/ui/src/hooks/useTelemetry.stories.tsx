import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { useTelemetry } from "./useTelemetry";
import type { TelemetryEntry } from "./useRealtimeTelemetry";
import { COLORS } from "../colors";

const meta: Meta = {
  title: "Hooks/useTelemetry",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const entry = (name: string, value: number, deviceId: string, timestamp: string): TelemetryEntry => ({
  name,
  value,
  unit: "V",
  timestamp,
  deviceId,
});

const historical: TelemetryEntry[] = [
  entry("Voltage", 47.5, "bsc-1", "2026-08-19T10:00:00.000Z"),
  entry("Voltage", 48.1, "bsc-1", "2026-08-19T10:05:00.000Z"),
];
const realtime: TelemetryEntry[] = [
  entry("Voltage", 48.9, "bsc-1", "2026-08-19T10:10:00.000Z"),
  entry("Voltage", 50.0, "bsc-2", "2026-08-19T10:10:00.000Z"),
];

const Demo: React.FC = () => {
  const { data, historicalCount, realtimeCount } = useTelemetry({
    historicalData: historical,
    realtimeData: realtime,
    deviceIds: ["bsc-1"],
  });

  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12, color: COLORS.textPrimary }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>Birleştirilmiş Veri</h3>
      <p style={{ fontSize: 13 }}>historical: {historicalCount} · realtime (filtreli): {realtimeCount} · toplam: {data.length}</p>
      <ul style={{ fontSize: 13, paddingLeft: 18 }}>
        {data.map((d, i) => (
          <li key={i}>
            {d.deviceId} / {d.name}: {d.value} ({d.timestamp})
          </li>
        ))}
      </ul>
    </div>
  );
};

export const MergedStreams: Story = {
  render: () => <Demo />,
};
