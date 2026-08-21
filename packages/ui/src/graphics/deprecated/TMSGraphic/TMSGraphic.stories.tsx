import type { Meta, StoryObj } from "@storybook/react";
import { TMSGraphic } from "./TMSGraphic";
import { createMockTMSSystemRoom } from "../../../__stories__/mocks/factories";

const meta: Meta<typeof TMSGraphic> = {
  title: "Graphics/Deprecated/TMSGraphic",
  component: TMSGraphic,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TMSGraphic>;

const rooms = [
  createMockTMSSystemRoom({ temp: 23.4 }),
  createMockTMSSystemRoom({ temp: 27.9 }),
  createMockTMSSystemRoom({
    temp: 21.1,
    hvacs: [{ status: "offline", mode: "idle" }, { status: "offline", mode: "idle" }],
  }),
];

export const Online: Story = {
  args: {
    rooms,
    panel_temp: 26.5,
    panel_humidity: 48,
    status: "online",
    width: 820,
    bordered: true,
    showRefresh: false,
  },
};

export const Offline: Story = {
  args: {
    rooms,
    panel_temp: 26.5,
    status: "offline",
    width: 820,
    bordered: true,
    showRefresh: false,
  },
};
