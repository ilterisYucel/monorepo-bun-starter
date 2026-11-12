import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "../theme";
import {
  ContainerPlan,
  ElectricalSingleLine,
  EventsLog,
  KpiRow,
  Sidebar,
  StringStates,
  TabRow,
  TopBar,
} from "../components/dashboard";

const meta: Meta = {
  title: "Screens/EMS Dashboard",
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

const Screen = () => (
  <div style={{ display: "flex", gap: 16, padding: 16, background: "#E4E9F4", alignItems: "flex-start" }}>
    <Sidebar
      active="dashboard"
      items={[
        { key: "dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "racks", label: "Rack Details", icon: "rackDetails" },
        { key: "control", label: "Control", icon: "control" },
        { key: "analytics", label: "Analytics", icon: "analytics" },
        { key: "reports", label: "Reports", icon: "reports" },
        { key: "history", label: "History", icon: "history" },
      ]}
    />
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 0 }}>
      <TabRow
        title="GD-1 · MV Station #1"
        subtitle="GDE-202030 · Polatlı, Ankara · 9 × LGES 40 ft · 32,1 MWh"
        pills={[
          { tone: "info", label: "Discharging · 14,8 MW" },
          { tone: "success", label: "PMS setpoint · 2.15 MW" },
          { tone: "success", label: "Ready" },
          { tone: "warning", label: "0 alarms · 2 warnings" },
        ]}
      />
      <TopBar
        tabs={[
          { key: "site", label: "Site layout" },
          { key: "devices", label: "Devices" },
          { key: "operations", label: "Operations" },
          { key: "grid", label: "Grid" },
          { key: "faults", label: "Faults" },
          { key: "admin", label: "Admin" },
        ]}
        active="devices"
        onSelect={() => undefined}
      />
      <KpiRow
        items={[
          { key: "a", label: "Active power · AC", value: "+2,15", unit: "MW", tone: "warning", bars: [{ label: "A", pct: 55 }, { label: "B", pct: 48 }] },
          { key: "b", label: "Reactive · apparent", value: "0,20", unit: "Mvar" },
          { key: "c", label: "SOC per BSC", value: "53,2", unit: "%", tone: "info" },
          { key: "d", label: "Energy available", value: "3,80", unit: "MWh" },
          { key: "e", label: "Power limits", value: "3,45", unit: "MW" },
          { key: "f", label: "Cell temperature", value: "22,7", unit: "°C", tone: "success" },
        ]}
      />
      <ElectricalSingleLine
        bscs={[
          { id: "BSC#1", dcBusLabel: "DC BUS#1 +/- · 2000 A", racks: [rack("Rack#1"), rack("Rack#2"), rack("Rack#3"), rack("Rack#4"), rack("Rack#5", "alarm"), rack("Rack#6"), rack("Rack#7", "offline"), rack("Rack#8", "alarm")] },
          { id: "BSC#2", dcBusLabel: "DC BUS#2 +/- · 2000 A", racks: [rack("Rack#9", "alarm"), rack("Rack#10"), rack("Rack#11", "warning"), rack("Rack#12"), rack("Rack#13"), rack("Rack#14"), rack("Rack#15"), rack("Rack#16")] },
        ]}
        cbms={[
          { id: "DC CBM#1", state: "CLOSED", voltage: 1328, current: 1092 },
          { id: "DC CBM#2", state: "CLOSED", voltage: 1324, current: 664 },
        ]}
        pcs={[
          { id: "PCS 1A", state: "Discharging", power: "1,42 MW", tone: "success" },
          { id: "PCS 1B", state: "Limited 50 %", power: "0,86 MW", tone: "warning" },
        ]}
        rmu={{ title: "RMU", state: "CLOSED", lines: ["H01 LBS in", "H02 CB motor", "H03 LBS out", "ES open"], values: [{ label: "34,5", value: "kV" }] }}
      />
      <ContainerPlan
        panel={{ temperature: 24, subtitle: "Control panel · FSS", scalePct: 62, footerLeft: "FSS normal · H2 0,3 %LEL", footerRight: "38 %rh" }}
        rooms={[
          { key: "r1", label: "Room 1", range: "R1–R4", temperature: 21.4, dots: ["success", "success", "warning", "success"], scalePct: 43, supply: 18.5, ret: 26.2, humidity: 41, chips: [{ label: "H1", pct: 64 }, { label: "H2", pct: 64 }] },
          { key: "r2", label: "Room 2", range: "R5–R8", temperature: 22.8, dots: ["success", "success", "success", "critical"], scalePct: 44, supply: 18.5, ret: 26.4, humidity: 42, chips: [{ label: "H3", pct: 64 }, { label: "H4", pct: 64 }] },
          { key: "r3", label: "Room 3", range: "R9–R12", temperature: 27.1, overTemp: true, dots: ["success", "success", "success", "success"], scalePct: 66, supply: 18.5, ret: 28.9, humidity: 44, chips: [{ label: "H5", pct: 64 }, { label: "H6", pct: 64 }] },
          { key: "r4", label: "Room 4", range: "R13–R16", temperature: 21.9, dots: ["success", "success", "success", "success"], scalePct: 44, supply: 18.5, ret: 26.3, humidity: 40, chips: [{ label: "H7", pct: 64 }, { label: "H8", pct: 64 }] },
        ]}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <EventsLog
          events={[
            { id: "1", time: "12.10 · 14:31:52", severity: "warning", source: "Room 3", message: "Air temperature 27,1 °C is above the 26,0 °C limit", status: "Active" },
            { id: "2", time: "12.10 · 14:31:40", severity: "warning", source: "Rack#11", message: "Rack temperature 28,6 °C above 28 °C", status: "Active" },
            { id: "3", time: "12.10 · 14:28:06", severity: "critical", source: "Rack#8", message: "Rack fault. String isolated at the rack fuse", status: "Active" },
            { id: "4", time: "12.10 · 14:27:58", severity: "info", source: "BSC#1", message: "Racks online changed to 6 of 8", status: "—" },
          ]}
        />
        <StringStates
          cards={[
            { key: "bsc1", title: "BSC#1 state", badge: { tone: "critical", label: "ALARM" }, rows: [{ key: "s", label: "BSC state", value: "Alarm · Rack#9 fault", tone: "critical" }, { key: "r", label: "Racks online", value: "6 / 8", tone: "critical" }] },
            { key: "bsc2", title: "BSC#2 state", badge: { tone: "warning", label: "WARNING" }, rows: [{ key: "s", label: "BSC state", value: "Warning · Rack#11 hot", tone: "warning" }, { key: "r", label: "Racks online", value: "8 / 8" }] },
          ]}
        />
      </div>
    </div>
  </div>
);

export const Light: Story = { render: () => <Screen /> };

export const Dark: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider mode="dark">
        <Story />
      </ThemeProvider>
    ),
  ],
  render: () => <Screen />,
};
