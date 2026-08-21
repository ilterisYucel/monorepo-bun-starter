import type { Meta, StoryObj } from "@storybook/react";
import { HvacCard } from "./HvacCard";

const meta: Meta<typeof HvacCard> = {
  title: "Components/HvacCard",
  component: HvacCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof HvacCard>;

export const RunningCooling: Story = {
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "running",
    currentTemp: 26.4,
    mode: "cooling",
    setTemp: 24,
    supplyTemp: 17.2,
    returnTemp: 26.1,
    returnHumidity: 52,
    supplyHumidity: 48,
    equipmentStatus: "cooling",
    alarmCount: 0,
  },
};

export const RunningWarming: Story = {
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "running",
    currentTemp: 18.2,
    mode: "warming",
    setTemp: 24,
    supplyTemp: 31.5,
    returnTemp: 18.4,
    returnHumidity: 44,
    supplyHumidity: 40,
    equipmentStatus: "heating",
    alarmCount: 0,
  },
};

export const Fault: Story = {
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "fault",
    currentTemp: 34.8,
    mode: "idle",
    setTemp: 24,
    supplyTemp: null,
    returnTemp: 34.6,
    returnHumidity: 61,
    supplyHumidity: null,
    equipmentStatus: "fault",
    alarmCount: 2,
  },
};

export const Standby: Story = {
  args: {
    name: "HVAC-2",
    room: "Oda 2",
    status: "standby",
    currentTemp: 23.1,
    mode: "idle",
    setTemp: 24,
  },
};
