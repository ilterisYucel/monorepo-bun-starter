import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "../../theme";
import { ContainerPlan } from "./ContainerPlan";
import { DcSections } from "./DcSections";
import { ElectricalSingleLine } from "./ElectricalSingleLine";
import { EventsLog, StringStates } from "./EventsPanel";
import { KpiRow } from "./KpiRow";
import { LegendPopover } from "./LegendPopover";
import { Sidebar } from "./Sidebar";
import { TabRow } from "./TabRow";
import { TopBar } from "./TopBar";

const meta: Meta = {
  title: "Dashboard/Overview",
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

const rack = (id: string, tone?: "alarm" | "warning" | "offline") => ({
  id,
  soc: 71.8,
  temperature: 23.4,
  voltage: 1324,
  current: 107,
  tone: tone ?? ("normal" as const),
});

export const Chrome: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 24, background: "#F4F7FC" }}>
      <Sidebar
        active="dashboard"
        items={[
          { key: "dashboard", label: "Dashboard", icon: "dashboard" },
          { key: "racks", label: "Rack Details", icon: "rackDetails" },
          { key: "control", label: "Control", icon: "control" },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TabRow
          title="GD-1 · MV Station #1"
          subtitle="GDE-202030 · Polatlı, Ankara · 9 × LGES 40 ft · 32,1 MWh"
          pills={[
            { tone: "info", label: "Discharging · 14,8 MW" },
            { tone: "success", label: "Ready" },
          ]}
        />
        <TopBar
          tabs={[
            { key: "devices", label: "Devices" },
            { key: "operations", label: "Operations" },
          ]}
          active="devices"
          onSelect={() => undefined}
        />
      </div>
    </div>
  ),
};

export const Kpis: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#F4F7FC" }}>
      <KpiRow
        items={[
          { key: "a", label: "Active power · AC", value: "+2,15", unit: "MW", tone: "warning", bars: [{ label: "A", pct: 55 }, { label: "B", pct: 48 }] },
          { key: "b", label: "Reactive · apparent", value: "0,20", unit: "Mvar" },
          { key: "c", label: "SOC per BSC", value: "53,2", unit: "%", tone: "info" },
        ]}
      />
    </div>
  ),
};

export const SingleLine: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#F4F7FC" }}>
      <ElectricalSingleLine
        bscs={[
          { id: "BSC#1", dcBusLabel: "DC BUS#1 +/- · 2000 A", racks: [rack("Rack#1"), rack("Rack#2"), rack("Rack#3", "alarm"), rack("Rack#4", "offline")] },
          { id: "BSC#2", dcBusLabel: "DC BUS#2 +/- · 2000 A", racks: [rack("Rack#9", "alarm"), rack("Rack#10"), rack("Rack#11", "warning")] },
        ]}
        cbms={[{ id: "DC CBM#1", state: "CLOSED", voltage: 1328, current: 1092 }]}
        pcs={[{ id: "PCS 1A", state: "Discharging", power: "1,42 MW" }]}
        rmu={{ title: "RMU", state: "CLOSED", lines: ["H01 LBS in", "ES open"], values: [{ label: "34,5", value: "kV" }] }}
      />
    </div>
  ),
};

export const Plan: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#F4F7FC" }}>
      <ContainerPlan
        panel={{ temperature: 24, subtitle: "Control panel · FSS", scalePct: 62, footerLeft: "FSS normal", footerRight: "38 %rh" }}
        rooms={[
          { key: "r1", label: "Room 1", range: "R1–R4", temperature: 21.4, dots: ["success", "success", "warning", "success"], scalePct: 43, supply: 18.5, ret: 26.2, humidity: 41, chips: [{ label: "H1", pct: 64 }] },
          { key: "r3", label: "Room 3", range: "R9–R12", temperature: 27.1, overTemp: true, dots: ["success", "success", "success", "success"], scalePct: 66, supply: 18.5, ret: 28.9, humidity: 44, chips: [{ label: "H5", pct: 64 }] },
        ]}
      />
    </div>
  ),
};

export const Logs: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, padding: 24, background: "#F4F7FC" }}>
      <EventsLog
        events={[
          { id: "1", time: "12.10 · 14:31:52", severity: "warning", source: "Room 3", message: "Air temperature 27,1 °C is above limit", status: "Active" },
          { id: "2", time: "12.10 · 14:28:06", severity: "critical", source: "Rack#8", message: "Rack fault", status: "Active" },
        ]}
      />
      <StringStates
        cards={[
          { key: "bsc1", title: "BSC#1 state", badge: { tone: "critical", label: "ALARM" }, rows: [{ key: "r", label: "Racks online", value: "6 / 8", tone: "critical" }] },
        ]}
      />
    </div>
  ),
};

export const DcSection: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#F4F7FC" }}>
      <DcSections
        sections={[
          { key: "bsc1", title: "BSC#1", subtitle: "8 racks · 8 online", badge: { tone: "critical", label: "ALARM" }, rows: [{ label: "BSC state", value: "Alarm · Rack#9 fault", tone: "critical" }], footer: "Values straight from each device" },
        ]}
      />
    </div>
  ),
};

export const Legend: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#F4F7FC" }}>
      <LegendPopover />
    </div>
  ),
};
