import type { Meta, StoryObj } from "@storybook/react";
import { PowerFlowAnimation } from "./PowerFlowAnimation";
import type { Rack } from "../../../types/rack";

const meta: Meta<typeof PowerFlowAnimation> = {
  title: "Graphics/Deprecated/PowerFlowAnimation",
  component: PowerFlowAnimation,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PowerFlowAnimation>;

const racks: Rack[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  deviceId: "BSC-1",
  name: `Rack-${i + 1}`,
  status: i % 5 === 4 ? "offline" : "online",
  charge_status: "Charge",
  soc: i % 5 === 4 ? 0 : 30 + i * 4,
  voltage: 48,
  current: 6,
  power_kw: 0.3,
  temperature: 28,
}));

export const Charge: Story = {
  args: { flowDirection: "Charge", racks, height: 260 },
};

export const Discharge: Story = {
  args: { flowDirection: "Discharge", racks, height: 260 },
};

export const Idle: Story = {
  args: { flowDirection: "Idle", racks, height: 260 },
};
