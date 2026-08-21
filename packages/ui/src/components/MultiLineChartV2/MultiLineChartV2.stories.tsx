import type { Meta, StoryObj } from "@storybook/react";
import { MultiLineChartV2 } from "./MultiLineChartV2";
import {
  createMockChartData,
  createMockLogEntry,
} from "../../__stories__/mocks/factories";

const meta: Meta<typeof MultiLineChartV2> = {
  title: "Components/MultiLineChartV2",
  component: MultiLineChartV2,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MultiLineChartV2>;

const singleSeries = createMockChartData(60, ["Voltage"]);

export const SingleSeries: Story = {
  args: {
    data: singleSeries,
    title: "Voltaj Geçmişi",
    yAxisLabel: "Volt (V)",
  },
};

export const MultiSeries: Story = {
  args: {
    data: createMockChartData(60, ["Voltage", "Current", "Power"]),
    title: "Çoklu Seri",
  },
};

export const WithAnnotations: Story = {
  args: {
    data: singleSeries,
    title: "Anotasyonlu Grafik",
    annotations: [createMockLogEntry({ message: "Şarj başladı" })],
  },
};

export const Loading: Story = {
  args: {
    data: [],
    title: "Yükleniyor...",
    isLoading: true,
  },
};

export const NoData: Story = {
  args: {
    data: [],
    title: "Veri Yok",
  },
};
