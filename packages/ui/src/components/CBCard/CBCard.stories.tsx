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
    isOpen: false,
  },
};

export const OnlineOpen: Story = {
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isOpen: true,
  },
};

export const Offline: Story = {
  args: {
    name: "CB-2",
    status: "offline",
    isClosed: false,
    isOpen: true,
  },
};
