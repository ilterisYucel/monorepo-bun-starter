import type { Meta, StoryObj } from "@storybook/react";
import { DCOutputCard } from "./DCOutputCard";

const meta: Meta<typeof DCOutputCard> = {
  title: "Components/DCOutputCard",
  component: DCOutputCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DCOutputCard>;

export const OnlineOn: Story = {
  args: {
    name: "DC-1",
    status: "online",
    isOn: true,
    actualVoltage: 48.2,
    actualCurrent: 12.1,
    setVoltage: 48,
    setCurrent: 12,
  },
};

export const OnlineOff: Story = {
  args: {
    name: "DC-1",
    status: "online",
    isOn: false,
    actualVoltage: 0,
    actualCurrent: 0,
    setVoltage: 48,
    setCurrent: 12,
  },
};

export const Offline: Story = {
  args: {
    name: "DC-2",
    status: "offline",
    isOn: false,
    actualVoltage: null,
    actualCurrent: null,
    setVoltage: null,
    setCurrent: null,
  },
};
