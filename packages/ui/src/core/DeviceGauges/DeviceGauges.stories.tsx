import type { Meta, StoryObj } from "@storybook/react";
import type { DeviceGaugeItem } from "./DeviceGauges.types";
import { DeviceGauges } from "./DeviceGauges";

const meta: Meta<typeof DeviceGauges> = {
  title: "Core/DeviceGauges",
  component: DeviceGauges,
  tags: ["autodocs"],
  argTypes: {
    deviceId: { control: "text" },
    variant: { control: "radio", options: ["linear", "circular"] },
    size: { control: "radio", options: ["small", "medium", "large"] },
  },
};

export default meta;

type Story = StoryObj<typeof DeviceGauges>;

const singleDeviceGauges: DeviceGaugeItem[] = [
  { value: 48.2, label: "Voltaj", unit: "V", min: 0, max: 60 },
  { value: 220, label: "AC Voltaj", unit: "V", min: 0, max: 400 },
  { value: 28.5, label: "Sıcaklık 1", unit: "°C", min: 0, max: 80 },
  { value: 32.1, label: "Sıcaklık 2", unit: "°C", min: 0, max: 80 },
];

const multiDeviceGauges1: DeviceGaugeItem[] = [
  { value: 48.2, label: "Voltaj", unit: "V", min: 0, max: 60 },
  { value: 15.2, label: "Akım", unit: "A", min: 0, max: 30 },
  { value: 85, label: "SoC", unit: "%", min: 0, max: 100 },
  { value: 28.5, label: "Sıcaklık", unit: "°C", min: 0, max: 80 },
];

const multiDeviceGauges2: DeviceGaugeItem[] = [
  { value: 46.1, label: "Voltaj", unit: "V", min: 0, max: 60 },
  { value: 22.8, label: "Akım", unit: "A", min: 0, max: 30 },
  { value: 42, label: "SoC", unit: "%", min: 0, max: 100 },
  { value: 34.7, label: "Sıcaklık", unit: "°C", min: 0, max: 80 },
];

export const SingleDevice: Story = {
  args: {
    deviceId: "BSC-1",
    gauges: singleDeviceGauges,
    variant: "circular",
  },
};

export const MultiDevice: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <DeviceGauges deviceId="BSC-1" gauges={multiDeviceGauges1} variant="circular" />
      <DeviceGauges deviceId="BSC-2" gauges={multiDeviceGauges2} variant="circular" />
    </div>
  ),
};
