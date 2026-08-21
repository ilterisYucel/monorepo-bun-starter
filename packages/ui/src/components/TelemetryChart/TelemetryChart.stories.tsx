import type { Meta, StoryObj } from "@storybook/react";
import { TelemetryChart } from "./TelemetryChart";
import {
  createMockTelemetryData,
  createMockTelemetryProvider,
  createMockLogEntry,
} from "../../__stories__/mocks/factories";

const meta: Meta<typeof TelemetryChart> = {
  title: "Components/TelemetryChart",
  component: TelemetryChart,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TelemetryChart>;

const names = ["Voltage", "Current", "Power", "Temperature"];
const data = createMockTelemetryData(names);

export const Default: Story = {
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "BSC-1 Telemetrisi",
    yAxisLabel: "Değer",
  },
};

export const SingleMetric: Story = {
  args: {
    provider: createMockTelemetryProvider(
      createMockTelemetryData(["Voltage"]),
      { selectedName: "Voltage" },
    ),
    telemetryNames: ["Voltage"],
    title: "Voltaj Geçmişi",
    yAxisLabel: "Volt (V)",
    defaultMetric: "Voltage",
  },
};

export const Loading: Story = {
  args: {
    provider: createMockTelemetryProvider([], { isLoading: true }),
    telemetryNames: names,
    title: "Yükleniyor...",
  },
};

export const Error: Story = {
  args: {
    provider: createMockTelemetryProvider([], {
      isError: true,
      error: new Error("Backend zaman aşımı"),
    }),
    telemetryNames: names,
    title: "Hata Durumu",
  },
};

export const WithEventAnnotations: Story = {
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "Olay Anotasyonlu",
    eventAnnotations: {
      logs: [createMockLogEntry({ message: "Şarj başladı" })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => {},
    },
  },
};

export const WithTagFilters: Story = {
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "Tag Filtreli",
    tagFilters: [
      { tagKey: "rackId", label: "Raf" },
      { tagKey: "deviceId", label: "Cihaz" },
    ],
  },
};
