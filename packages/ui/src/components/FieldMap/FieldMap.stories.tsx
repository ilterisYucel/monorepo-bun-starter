import type { Meta, StoryObj } from "@storybook/react";
import { FieldMap } from "./FieldMap";

const meta: Meta<typeof FieldMap> = {
  title: "Components/FieldMap",
  component: FieldMap,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FieldMap>;

const fields = [
  {
    id: "field-1",
    name: "Solar Park 1",
    lat: 38.4,
    lng: 27.1,
    status: "online" as const,
    containerCount: 4,
    onlineContainerCount: 4,
    totalPowerMw: 12.4,
    avgSoc: 82,
  },
  {
    id: "field-2",
    name: "Wind Site 2",
    lat: 39.9,
    lng: 32.8,
    status: "warning" as const,
    containerCount: 4,
    onlineContainerCount: 3,
    totalPowerMw: 8.1,
    avgSoc: 65,
    activeAlarms: 2,
  },
  {
    id: "field-3",
    name: "Demo Site 3",
    lat: 41.0,
    lng: 28.9,
    status: "offline" as const,
    containerCount: 2,
    onlineContainerCount: 0,
  },
];

export const Default: Story = {
  args: {
    fields,
    height: 420,
  },
};

export const Selected: Story = {
  args: {
    fields,
    selectedFieldId: "field-1",
    height: 420,
  },
};
