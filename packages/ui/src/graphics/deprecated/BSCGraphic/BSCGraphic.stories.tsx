import type { Meta, StoryObj } from "@storybook/react";
import { BSCGraphic } from "./BSCGraphic";
import type { BSCUnit } from "./BSCGraphic.types";
import { createMockBSCUnit } from "../../../__stories__/mocks/factories";

const meta: Meta<typeof BSCGraphic> = {
  title: "Graphics/Deprecated/BSCGraphic",
  component: BSCGraphic,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof BSCGraphic>;

const unit: BSCUnit = createMockBSCUnit({
  deviceId: "BSC-1",
  racks: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    deviceId: "BSC-1",
    name: `Rack-${i + 1}`,
    status: i === 2 ? "offline" : "online",
    charge_status: "Charge",
    soc: i === 2 ? 0 : 40 + i * 6,
    voltage: 48,
    current: 6,
    power_kw: 0.3,
    temperature: 28,
  })),
});

export const ChargeMode: Story = {
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Charge",
    width: 820,
    bordered: true,
    showRefresh: false,
  },
};

export const DischargeMode: Story = {
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Discharge",
    width: 820,
    bordered: true,
    showRefresh: false,
  },
};

export const IdleMode: Story = {
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Idle",
    width: 820,
    bordered: true,
    showRefresh: false,
  },
};
