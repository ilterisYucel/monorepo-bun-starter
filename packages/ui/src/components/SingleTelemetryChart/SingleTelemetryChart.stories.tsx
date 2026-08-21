import type { Meta, StoryObj } from "@storybook/react";
import { SingleTelemetryChart } from "./SingleTelemetryChart";
import {
  createMockTelemetryData,
  createMockTelemetryProvider,
} from "../../__stories__/mocks/factories";

const meta: Meta<typeof SingleTelemetryChart> = {
  title: "Components/SingleTelemetryChart",
  component: SingleTelemetryChart,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SingleTelemetryChart>;

export const Default: Story = {
  args: {
    provider: createMockTelemetryProvider(createMockTelemetryData(["Voltage"])),
    telemetryNames: ["Voltage"],
    title: "Voltaj",
    yAxisLabel: "V",
  },
};

export const Tall: Story = {
  args: {
    provider: createMockTelemetryProvider(createMockTelemetryData(["Current"])),
    telemetryNames: ["Current"],
    title: "Akım",
    yAxisLabel: "A",
    height: 480,
  },
};
