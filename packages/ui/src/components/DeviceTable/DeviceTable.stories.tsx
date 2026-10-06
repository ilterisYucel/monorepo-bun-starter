import type { Meta, StoryObj } from "@storybook/react";
import { DeviceTable } from "./DeviceTable";
import type { DeviceTableRow } from "./DeviceTable.types";

const meta: Meta<typeof DeviceTable> = {
  title: "Components/DeviceTable",
  component: DeviceTable,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DeviceTable>;

const devices: DeviceTableRow[] = [
  {
    id: "bsc-1",
    name: "BSC-1",
    type: "bsc",
    protocol: "modbus",
    details: { rackCount: 8 },
    model: "LG BSC",
    status: "online",
    poll_interval_ms: 1000,
    last_seen: new Date().toISOString(),
  },
  {
    id: "hvac-1",
    name: "HVAC-1",
    type: "hvac",
    protocol: "modbus",
    details: null,
    model: "General HVAC",
    status: "online",
    poll_interval_ms: 5000,
    last_seen: new Date().toISOString(),
  },
  {
    id: "cb-1",
    name: "CB-1",
    type: "breaker",
    protocol: "modbus",
    details: null,
    model: null,
    status: "offline",
    poll_interval_ms: 1000,
    last_seen: null,
  },
];

export const Default: Story = {
  args: { devices },
};

export const Loading: Story = {
  args: { devices: [], isLoading: true },
};

export const Empty: Story = {
  args: { devices: [] },
};
