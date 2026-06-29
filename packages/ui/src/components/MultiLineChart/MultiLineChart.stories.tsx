import type { Meta, StoryObj } from "@storybook/react";
import { MultiLineChart } from "./MultiLineChart";
import { createMockChartData, createMockLogEntry } from "../../__stories__/mocks/factories";

const meta: Meta<typeof MultiLineChart> = {
  title: "Components/MultiLineChart",
  component: MultiLineChart,
  tags: ["autodocs"],
  argTypes: {
    height: { control: "number" },
    showLegend: { control: "boolean" },
    isLoading: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof MultiLineChart>;

export const SingleSeries: Story = {
  args: {
    data: createMockChartData(24, ["voltage"]),
    title: "Voltaj Geçmişi",
    yAxisLabel: "Voltaj (V)",
  },
};

const multiSeriesData = createMockChartData(24, ["voltage", "current", "power"]);
const [ann1, ann2, ann3] = multiSeriesData;

export const MultiSeries: Story = {
  args: {
    data: multiSeriesData,
    title: "Çoklu Seri Grafiği",
    yAxisLabel: "Değer",
  },
};

export const WithAnnotations: Story = {
  args: {
    data: multiSeriesData,
    title: "Anotasyonlu Grafik",
    yAxisLabel: "Değer",
    annotations: ann1 && ann2 && ann3
      ? [
          createMockLogEntry({
            type: "warning",
            timestamp: ann1.timestamp,
            message: "Voltaj düşüşü",
          }),
          createMockLogEntry({
            type: "error",
            timestamp: ann2.timestamp,
            message: "Akım kesintisi",
          }),
          createMockLogEntry({
            type: "info",
            timestamp: ann3.timestamp,
            message: "Sistem normale döndü",
          }),
        ]
      : undefined,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    isLoading: true,
  },
};

export const NoData: Story = {
  args: {
    data: [],
  },
};
