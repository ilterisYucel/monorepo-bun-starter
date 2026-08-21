import type { Meta, StoryObj } from "@storybook/react";
import { PlayCanvasViewer } from "./PlayCanvasViewer";
import { createMockContainer3DStates } from "../../__stories__/mocks/factories";

const meta: Meta<typeof PlayCanvasViewer> = {
  title: "Components/PlayCanvasViewer",
  component: PlayCanvasViewer,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PlayCanvasViewer>;

export const Default: Story = {
  args: {
    containers: createMockContainer3DStates(),
    height: 420,
  },
};

export const WithOrbitAndGrid: Story = {
  args: {
    containers: createMockContainer3DStates(),
    orbitControls: true,
    showGrid: true,
    showLabels: true,
    height: 480,
  },
};
