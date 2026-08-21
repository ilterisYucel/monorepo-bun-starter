import type { Meta, StoryObj } from "@storybook/react";
import { FieldCard } from "./FieldCard";

const meta: Meta<typeof FieldCard> = {
  title: "Components/FieldCard",
  component: FieldCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FieldCard>;

export const Online: Story = {
  args: {
    field: {
      id: "field-1",
      name: "Solar Park 1",
      status: "online",
      containerCount: 4,
      onlineContainerCount: 4,
      totalPowerMw: 12.4,
      avgSoc: 82,
      activeAlarms: 0,
    },
  },
};

export const Warning: Story = {
  args: {
    field: {
      id: "field-2",
      name: "Wind Site 2",
      status: "warning",
      containerCount: 4,
      onlineContainerCount: 3,
      totalPowerMw: 8.1,
      avgSoc: 65,
      activeAlarms: 2,
    },
  },
};

export const Offline: Story = {
  args: {
    field: {
      id: "field-3",
      name: "Demo Site 3",
      status: "offline",
      containerCount: 2,
      onlineContainerCount: 0,
    },
  },
};
