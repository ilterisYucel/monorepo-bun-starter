import type { Meta, StoryObj } from "@storybook/react";
import { DeviceDetailModal } from "./DeviceDetailModal";
import type { IDeviceDetailProvider } from "../../interfaces/device-detail-provider";

const meta: Meta<typeof DeviceDetailModal> = {
  title: "Components/Deprecated/DeviceDetailModal",
  component: DeviceDetailModal,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DeviceDetailModal>;

const provider: IDeviceDetailProvider = {
  devices: async () => [
    { id: "rack-1", type: "rack", status: "online", lastSeen: new Date().toISOString() },
    { id: "rack-2", type: "rack", status: "online", lastSeen: new Date().toISOString() },
    { id: "cb-1", type: "breaker", status: "offline", lastSeen: new Date().toISOString() },
  ],
};

export const Open: Story = {
  args: {
    deviceId: "bsc-1",
    provider,
    open: true,
    onClose: () => {},
  },
};
