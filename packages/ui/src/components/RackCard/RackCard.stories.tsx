import type { Meta, StoryObj } from "@storybook/react";
import { RackCard } from "./RackCard";
import { createMockRack } from "../../__stories__/mocks/factories";

const meta: Meta<typeof RackCard> = {
  title: "Components/RackCard",
  component: RackCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof RackCard>;

export const OnlineCharging: Story = {
  args: createMockRack("online", "Charge", {
    soc: 85,
    voltage: 48.5,
    current: 15.2,
  }),
};

export const OnlineDischarging: Story = {
  args: createMockRack("online", "Discharge", {
    soc: 42,
    voltage: 46.1,
  }),
};

export const Offline: Story = {
  args: createMockRack("offline", "Idle", {
    soc: null,
  }),
};

export const Idle: Story = {
  args: createMockRack("online", "Idle", {
    soc: 72,
  }),
};
