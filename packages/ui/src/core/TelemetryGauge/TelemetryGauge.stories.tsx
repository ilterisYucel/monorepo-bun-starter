import type { Meta, StoryObj } from "@storybook/react";
import { TelemetryGauge } from "./TelemetryGauge";

const meta: Meta<typeof TelemetryGauge> = {
  title: "Core/TelemetryGauge",
  component: TelemetryGauge,
  tags: ["autodocs"],
  argTypes: {
    value: { control: "number" },
    label: { control: "text" },
    unit: { control: "text" },
    size: { control: "radio", options: ["small", "medium", "large"] },
    variant: { control: "radio", options: ["linear", "circular"] },
    decimals: { control: "number" },
    theme: {
      control: "radio",
      options: ["info", "success", "warning", "error", "purple", "temp"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof TelemetryGauge>;

export const Linear50Percent: Story = {
  args: {
    value: 50.0,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "kW",
    size: "medium",
    variant: "linear",
  },
};

export const Circular75Percent: Story = {
  args: {
    value: 75.0,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "circular",
  },
};

export const Small: Story = {
  args: {
    value: 42,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "°C",
    size: "small",
    variant: "linear",
  },
};

export const Large: Story = {
  args: {
    value: 220,
    min: 0,
    max: 300,
    label: "BSC-1 Sıcaklık",
    unit: "V",
    size: "large",
    variant: "linear",
  },
};

export const LowValue5Percent: Story = {
  args: {
    value: 5,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "linear",
  },
};

export const HighValue95Percent: Story = {
  args: {
    value: 95,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "circular",
  },
};

export const SuccessTheme: Story = {
  args: {
    value: 68,
    min: 0,
    max: 100,
    label: "SoC",
    unit: "%",
    size: "medium",
    variant: "circular",
    theme: "success",
  },
};

export const WarningTheme: Story = {
  args: {
    value: 72,
    min: 0,
    max: 100,
    label: "Yük",
    unit: "%",
    size: "medium",
    variant: "circular",
    theme: "warning",
  },
};

export const ErrorTheme: Story = {
  args: {
    value: 88,
    min: 0,
    max: 100,
    label: "Alarm",
    unit: "",
    size: "medium",
    variant: "circular",
    theme: "error",
  },
};

export const PurpleTheme: Story = {
  args: {
    value: 45,
    min: 0,
    max: 100,
    label: "PCS Gücü",
    unit: "kW",
    size: "medium",
    variant: "circular",
    theme: "purple",
  },
};

export const TempTheme: Story = {
  args: {
    value: 32,
    min: 0,
    max: 50,
    label: "Oda Sıcaklığı",
    unit: "°C",
    size: "medium",
    variant: "circular",
    theme: "temp",
  },
};

export const LinearWarningTheme: Story = {
  args: {
    value: 60,
    min: 0,
    max: 100,
    label: "Nem",
    unit: "%",
    size: "medium",
    variant: "linear",
    theme: "warning",
  },
};
