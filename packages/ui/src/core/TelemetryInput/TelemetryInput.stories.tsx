import type { Meta, StoryObj } from "@storybook/react";
import { TelemetryInput } from "./TelemetryInput";

const meta: Meta<typeof TelemetryInput> = {
  title: "Core/TelemetryInput",
  component: TelemetryInput,
  tags: ["autodocs"],
  argTypes: {
    value: { control: "number" },
    name: { control: "text" },
    unit: { control: "text" },
    status: { control: "radio", options: ["nominal", "warning", "alarm"] },
    size: { control: "radio", options: ["small", "medium", "large"] },
    disabled: { control: "boolean" },
    showRangeBar: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof TelemetryInput>;

const noop = () => {};

export const Nominal: Story = {
  args: {
    name: "DC Voltage",
    value: 48.2,
    unit: "V",
    status: "nominal",
    onChange: noop,
  },
};

export const Warning: Story = {
  args: {
    name: "Battery SoC",
    value: 12.5,
    unit: "%",
    status: "warning",
    warningThreshold: 20,
    onChange: noop,
    min: 0,
    max: 100,
  },
};

export const Alarm: Story = {
  args: {
    name: "Battery SoC",
    value: 3.2,
    unit: "%",
    status: "alarm",
    alarmThreshold: 5,
    onChange: noop,
    min: 0,
    max: 100,
  },
};

export const WithTags: Story = {
  args: {
    name: "Rack-1 Cell-3",
    value: 3.72,
    unit: "V",
    tags: { rack_id: "1", cell: "3", zone: "A" },
    onChange: noop,
  },
};

export const Disabled: Story = {
  args: {
    name: "Disabled Input",
    value: 25,
    unit: "A",
    disabled: true,
    onChange: noop,
  },
};

export const WithRangeBar: Story = {
  args: {
    name: "Setpoint",
    value: 65,
    unit: "%",
    showRangeBar: true,
    min: 0,
    max: 100,
    onChange: noop,
  },
};
