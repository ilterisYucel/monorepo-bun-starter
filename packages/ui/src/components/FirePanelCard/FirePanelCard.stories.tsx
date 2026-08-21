import type { Meta, StoryObj } from "@storybook/react";
import { FirePanelCard } from "./FirePanelCard";
import { createMockFirePanelState } from "../../__stories__/mocks/factories";

const meta: Meta<typeof FirePanelCard> = {
  title: "Components/FirePanelCard",
  component: FirePanelCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FirePanelCard>;

export const Normal: Story = {
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState(),
  },
};

export const FireAlarm: Story = {
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState({ fire: true, firstStage: true, localFire: true }),
  },
};

export const Fault: Story = {
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState({ fault: true }),
  },
};
