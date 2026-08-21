import type { Meta, StoryObj } from "@storybook/react";
import { EnergyAnalyzerCard } from "./EnergyAnalyzerCard";
import { createMockEnergyAnalyzerSummary } from "../../__stories__/mocks/factories";

const meta: Meta<typeof EnergyAnalyzerCard> = {
  title: "Components/EnergyAnalyzerCard",
  component: EnergyAnalyzerCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof EnergyAnalyzerCard>;

export const Default: Story = {
  args: {
    summary: createMockEnergyAnalyzerSummary(),
    totalActivePower: 12.7,
  },
};

export const HighDemand: Story = {
  args: {
    summary: createMockEnergyAnalyzerSummary(),
    totalActivePower: 48.9,
  },
};
