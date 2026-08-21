import type { Meta, StoryObj } from "@storybook/react";
import { RackInfoPopover } from "./RackInfoPopover";
import { createMockRack } from "../../../__stories__/mocks/factories";

const meta: Meta<typeof RackInfoPopover> = {
  title: "Graphics/RackInfoPopover",
  component: RackInfoPopover,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof RackInfoPopover>;

export const Visible: Story = {
  args: {
    rack: createMockRack("online", "Charge", {
      soc: 85,
      voltage: 48.5,
      current: 15.2,
      temperature: 28,
    }),
    x: 120,
    y: 60,
    visible: true,
    onClose: () => {},
  },
};

export const Hidden: Story = {
  args: {
    rack: createMockRack("offline", "Idle", { soc: 0 }),
    x: 120,
    y: 60,
    visible: false,
    onClose: () => {},
  },
};
