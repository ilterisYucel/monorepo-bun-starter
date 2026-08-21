import type { Meta, StoryObj } from "@storybook/react";
import { CBCard } from "./CBCard";

const meta: Meta<typeof CBCard> = {
  title: "Components/CBCard",
  component: CBCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof CBCard>;

export const OnlineClosed: Story = {
  args: {
    name: "CB-1",
    status: "online",
    isClosed: true,
    isTripped: false,
    voltage: 400.2,
    current: 12.4,
    tripCount: 2,
    closeCount: 31,
  },
};

export const OnlineOpen: Story = {
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isTripped: false,
    voltage: 398.8,
    current: 0,
    tripCount: 2,
    closeCount: 31,
  },
};

export const Tripped: Story = {
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isTripped: true,
    voltage: 0,
    current: 0,
    tripCount: 3,
    closeCount: 31,
  },
};

export const Offline: Story = {
  args: {
    name: "CB-2",
    status: "offline",
    isClosed: false,
    isTripped: false,
    voltage: null,
    current: null,
    tripCount: 0,
    closeCount: 12,
  },
};
