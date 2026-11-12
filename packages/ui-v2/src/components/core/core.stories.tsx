import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "../../theme";
import { Alerts } from "./Alerts";
import { BessContainerCard } from "./BessContainerCard";
import type { BessUnit } from "./BessContainerCard";
import { KpiWidget } from "./KpiWidget";

const unit: BessUnit = {
  id: "BESS#1",
  status: "normal",
  stateLabel: "DISCHARGE · 2/2 PCS",
  pcs: "2/2 PCS",
  banks: [
    { label: "A", voltage: 1346, soc: 61.4, soh: 97.8, temperature: 22.6 },
    { label: "B", voltage: 1345, soc: 60.9, soh: 97.6, temperature: 21.2 },
  ],
};

const meta: Meta = {
  title: "Core/Overview",
  decorators: [
    (Story) => (
      <ThemeProvider mode="light">
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj;

export const BessCards: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, padding: 24, background: "#F4F7FC" }}>
      <BessContainerCard variant="v1" unit={unit} />
      <BessContainerCard variant="v2" unit={unit} />
      <BessContainerCard variant="v3" unit={unit} />
      <BessContainerCard
        variant="v2"
        unit={{ ...unit, id: "BESS#7", status: "alarm", stateLabel: "ISOLATED · PCS FAULT" }}
      />
    </div>
  ),
};

export const KpiWidgets: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 24, background: "#F4F7FC" }}>
      <KpiWidget variant="a" label="Average SOC" value="61,1" unit="%" percent={61} tone="success" />
      <KpiWidget variant="b" label="Site power · POI" value="+2,15" unit="MW" percent={72} tone="warning" min="min 0" max="max 5 MW" />
    </div>
  ),
};

export const AlertVariants: Story = {
  render: () => (
    <Alerts
      variant="a"
      items={[
        { id: "1", time: "14:31:52", severity: "warning", source: "Room 3", message: "Air temperature high", status: "Active", unacknowledged: true },
        { id: "2", time: "14:28:06", severity: "critical", source: "Rack#8", message: "Rack fault", status: "Active" },
      ]}
    />
  ),
};
