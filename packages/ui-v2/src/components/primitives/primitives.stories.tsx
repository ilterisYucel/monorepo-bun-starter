import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "../../theme";
import { Badge, Button, Card, CountBadge, StatusPill, Table, Tabs } from ".";

const meta: Meta = {
  title: "Primitives/Overview",
  decorators: [
    (Story) => (
      <ThemeProvider mode="light">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj;

export const Pills: Story = {
  render: () => (
    <>
      <StatusPill tone="info">Discharging · 14,8 MW</StatusPill>
      <StatusPill tone="success">PMS setpoint · 2.15 MW</StatusPill>
      <StatusPill tone="warning">0 alarms · 2 warnings</StatusPill>
      <StatusPill tone="critical">Fault</StatusPill>
    </>
  ),
};

export const Badges: Story = {
  render: () => (
    <>
      <Badge tone="success">ONLINE</Badge>
      <Badge tone="warning">WARNING</Badge>
      <Badge tone="critical">ALARM</Badge>
      <Badge tone="info">INFO</Badge>
      <Badge tone="maint">MAINT</Badge>
      <CountBadge value={2} />
    </>
  ),
};

export const Buttons: Story = {
  render: () => (
    <>
      <Button variant="primary">Open EMS view · BESS#3 →</Button>
      <Button variant="critical">Emergency stop</Button>
      <Button variant="secondary">Export report</Button>
    </>
  ),
};

export const TabsGallery: Story = {
  render: () => (
    <Tabs
      items={[
        { key: "all", label: "All" },
        { key: "alarms", label: "Alarms", count: 2, countTone: "critical" },
        { key: "warnings", label: "Warnings", count: 2, countTone: "warning" },
        { key: "info", label: "Info" },
      ]}
      value="all"
      onChange={() => undefined}
      variant="segmented"
    />
  ),
};

export const Cards: Story = {
  render: () => (
    <>
      <Card title="Top-level card" style={{ width: 300 }}>
        Surface · r16 · Card shadow
      </Card>
      <Card variant="nested" style={{ width: 300 }}>
        Nested · r12 · border
      </Card>
      <Card status="critical" style={{ width: 300 }}>
        Status card · 1.5 px
      </Card>
    </>
  ),
};

export const TableGallery: Story = {
  render: () => (
    <Table
      columns={[
        { key: "time", label: "TIME" },
        { key: "message", label: "MESSAGE" },
      ]}
      rows={[{ time: "14:31:52", message: "Room 3 warning" }]}
    />
  ),
};
