import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./Sparkline";
import { COLORS } from "../../colors";

const meta: Meta<typeof Sparkline> = {
  title: "Components/Sparkline",
  component: Sparkline,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Sparkline>;

const series = (start: number, n: number, step: number) =>
  Array.from({ length: n }, (_, i) => ({
    time: new Date(start + i * 60_000).toISOString(),
    value: 50 + Math.round(Math.sin(i / 6) * step * 10) / 10,
  }));

export const Default: Story = {
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 2),
    color: COLORS.success,
    height: 46,
  },
};

export const Warning: Story = {
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 4),
    color: COLORS.warning,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    color: COLORS.success,
  },
};
