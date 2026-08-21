import type { Meta, StoryObj } from "@storybook/react";
import { ContainerConnectionBadge } from "./ContainerConnectionBadge";

const meta: Meta<typeof ContainerConnectionBadge> = {
  title: "Components/ContainerConnectionBadge",
  component: ContainerConnectionBadge,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ContainerConnectionBadge>;

export const Connected: Story = {
  args: { connected: true, label: "Field Bağlantısı" },
};

export const Disconnected: Story = {
  args: { connected: false, label: "Field Bağlantısı" },
};

export const Small: Story = {
  args: { connected: true, label: "Bağlı", size: "small" },
};
