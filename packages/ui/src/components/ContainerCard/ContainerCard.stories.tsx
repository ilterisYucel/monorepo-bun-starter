import type { Meta, StoryObj } from "@storybook/react";
import { ContainerCard } from "./ContainerCard";

const meta: Meta<typeof ContainerCard> = {
  title: "Components/ContainerCard",
  component: ContainerCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ContainerCard>;

export const OnlineConnected: Story = {
  args: {
    containerId: "container-1",
    name: "Konteyner 1",
    status: "online",
    connected: true,
    soc: 82,
    powerKw: 420,
    temperature: 27,
    deviceCount: 5,
    activeDeviceCount: 5,
  },
};

export const WarningConnected: Story = {
  args: {
    containerId: "container-2",
    name: "Konteyner 2",
    status: "warning",
    connected: true,
    soc: 55,
    powerKw: -180,
    temperature: 34,
    deviceCount: 5,
    activeDeviceCount: 4,
  },
};

export const OfflineDisconnected: Story = {
  args: {
    containerId: "container-3",
    name: "Konteyner 3",
    status: "offline",
    connected: false,
    deviceCount: 5,
    activeDeviceCount: 0,
  },
};
