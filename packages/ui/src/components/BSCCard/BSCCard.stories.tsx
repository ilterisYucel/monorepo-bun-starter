import type { Meta, StoryObj } from "@storybook/react";
import { BSCCard } from "./BSCCard";

const meta: Meta<typeof BSCCard> = {
  title: "Components/BSCCard",
  component: BSCCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof BSCCard>;

export const OnlineCharging: Story = {
  args: {
    name: "BSC-1",
    status: "online",
    chargeStatus: "Charge",
    soc: 85,
    soh: 96,
    rackCount: 8,
    onlineRackCount: 8,
    systemPowerKw: 356,
    voltage: 52.1,
    current: 6.8,
    chargePowerKw: 356,
    dischargePowerKw: 0,
  },
};

export const OnlineDischarging: Story = {
  args: {
    name: "BSC-2",
    status: "online",
    chargeStatus: "Discharge",
    soc: 42,
    soh: 91,
    rackCount: 8,
    onlineRackCount: 7,
    systemPowerKw: -220,
    voltage: 48.9,
    current: -4.5,
    chargePowerKw: 0,
    dischargePowerKw: 220,
  },
};

export const Offline: Story = {
  args: {
    name: "BSC-3",
    status: "offline",
    chargeStatus: "Idle",
    soc: null,
    soh: null,
    rackCount: 8,
    onlineRackCount: 0,
    systemPowerKw: null,
    voltage: null,
    current: null,
    chargePowerKw: null,
    dischargePowerKw: null,
  },
};
