import type { Meta, StoryObj } from "@storybook/react";
import { ManeuverCard } from "./ManeuverCard";
import {
  createMockManeuverConfig,
  createMockManeuverInputs,
  createMockStepResults,
} from "../../__stories__/mocks/factories";

const meta: Meta<typeof ManeuverCard> = {
  title: "Components/ManeuverCard",
  component: ManeuverCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ManeuverCard>;

const noop = () => {};
const maneuver = createMockManeuverConfig();
const inputs = createMockManeuverInputs();

export const Idle: Story = {
  args: {
    maneuver,
    state: "idle",
    inputs,
    timerConfig: true,
    onRun: noop,
    onTimerExpired: noop,
  },
};

export const Running: Story = {
  args: {
    maneuver,
    state: "running",
    onRun: noop,
  },
};

export const TimerPending: Story = {
  args: {
    maneuver,
    state: "timer",
    timerConfig: true,
    onRun: noop,
    onTimerExpired: noop,
  },
};

export const Success: Story = {
  args: {
    maneuver,
    state: "success",
    stepResults: createMockStepResults(true),
    onRun: noop,
  },
};

export const Failed: Story = {
  args: {
    maneuver,
    state: "failed",
    stepResults: createMockStepResults(false),
    onRetry: noop,
    onRollback: noop,
  },
};
