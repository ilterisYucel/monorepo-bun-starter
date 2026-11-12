import type { EventLogRow, StringStateCard } from "@gd-monorepo/ui-v2";
import type {
  BscBlock,
  CbmBlock,
  ContainerPlanPanel,
  KpiCardData,
  PcsBlock,
  RmuBlock,
  RoomPlan,
  SidebarNavItem,
  TabRowPill,
  TopBarTab,
  TrafoBlock,
} from "@gd-monorepo/ui-v2";

export interface EmsDashboardMock {
  title: string;
  subtitle: string;
  pills: TabRowPill[];
  liveText: string;
  clock: string;
  kpis: KpiCardData[];
  bscs: BscBlock[];
  cbms: CbmBlock[];
  pcs: PcsBlock[];
  rmu: RmuBlock;
  trafo: TrafoBlock;
  panel: ContainerPlanPanel;
  rooms: RoomPlan[];
  events: EventLogRow[];
  states: StringStateCard[];
}

export const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "racks", label: "Rack Details", icon: "rackDetails" },
  { key: "control", label: "Control", icon: "control" },
  { key: "analytics", label: "Analytics", icon: "analytics" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "history", label: "History", icon: "history" },
];

export const TOP_TABS: TopBarTab[] = [
  { key: "site", label: "Site layout" },
  { key: "devices", label: "Devices" },
  { key: "operations", label: "Operations" },
  { key: "grid", label: "Grid" },
  { key: "faults", label: "Faults" },
  { key: "admin", label: "Admin" },
];

const rack = (
  id: string,
  tone: "normal" | "warning" | "alarm" | "offline" = "normal",
  overrides: Partial<{
    soc: number;
    temperature: number;
    voltage: number;
    current: number;
    selected: boolean;
    minCellBarIndex: number;
    alarmBarIndex: number;
  }> = {},
) => ({
  id,
  soc: overrides.soc ?? 71.8,
  temperature: overrides.temperature ?? 23.4,
  voltage: overrides.voltage ?? 1324,
  current: overrides.current ?? 107,
  tone,
  selected: overrides.selected,
  minCellBarIndex: overrides.minCellBarIndex,
  alarmBarIndex: overrides.alarmBarIndex,
});

export const EMS_DASHBOARD: EmsDashboardMock = {
  title: "GD-1 · MV Station #1",
  subtitle: "GDE-202030 · Polatlı, Ankara · 9 × LGES 40 ft · 32,1 MWh",
  pills: [
    { tone: "info", label: "Discharging · 14,8 MW" },
    { tone: "success", label: "PMS setpoint · 2.15 MW" },
    { tone: "success", label: "Ready" },
    { tone: "warning", label: "0 alarms · 2 warnings" },
  ],
  liveText: "Live · updated 1 s ago",
  clock: "23.10.2026 · 13:24",
  kpis: [
    {
      key: "active-power",
      label: "Active power · AC",
      value: "+2,15",
      unit: "MW",
      tone: "warning",
      bars: [
        { label: "A", pct: 62 },
        { label: "B", pct: 62 },
      ],
    },
    {
      key: "reactive",
      label: "Reactive · apparent",
      value: "0,20",
      unit: "Mvar",
      kv: [
        { label: "Apparent", value: "2,16 MVA" },
        { label: "Power factor", value: "0,996" },
      ],
    },
    {
      key: "soc",
      label: "SOC per BSC",
      value: "53,2",
      unit: "%",
      tone: "info",
      valueSize: "compact",
      bars: [
        { label: "A", pct: 53 },
        { label: "B", pct: 53 },
      ],
    },
    {
      key: "energy",
      label: "Energy available",
      value: "3,80",
      unit: "MWh",
      track: { pct: 53, tone: "success" },
      caption: "of 7,14 MWh nameplate",
    },
    {
      key: "limits",
      label: "Power limits",
      value: "3,45",
      unit: "MW",
      kv: [
        { label: "Charge", value: "3,45 MW" },
        { label: "Discharge", value: "3,45 MW" },
      ],
    },
    {
      key: "temperature",
      label: "Cell temperature",
      value: "22,7",
      unit: "°C max",
      band: {
        start: 26.6,
        width: 40,
        markers: [
          { pct: 38, tone: "info" },
          { pct: 48.8, tone: "critical" },
        ],
      },
      caption: "min 20,9 · ΔT 1,8 °C",
    },
  ],
  bscs: [
    {
      id: "BSC#1",
      dcBusLabel: "DC BUS#1 +/- · 2000 A",
      racks: [
        rack("Rack#1", "normal", { soc: 71.1, selected: true }),
        rack("Rack#2"),
        rack("Rack#3", "normal", { minCellBarIndex: 10 }),
        rack("Rack#4"),
        rack("Rack#5", "warning", {
          temperature: 28.6,
          alarmBarIndex: 4,
          minCellBarIndex: 8,
        }),
        rack("Rack#6", "offline"),
        rack("Rack#7"),
        rack("Rack#8", "alarm", { soc: 71.1, alarmBarIndex: 6 }),
      ],
    },
    {
      id: "BSC#2",
      dcBusLabel: "DC BUS#2 +/- · 2000 A",
      racks: [
        rack("Rack#9", "normal", { soc: 71.1 }),
        rack("Rack#10", "normal", { minCellBarIndex: 9 }),
        rack("Rack#11", "warning", {
          temperature: 28.6,
          alarmBarIndex: 4,
          minCellBarIndex: 8,
        }),
        rack("Rack#12"),
        rack("Rack#13"),
        rack("Rack#14"),
        rack("Rack#15"),
        rack("Rack#16", "normal", { soc: 71.1 }),
      ],
    },
  ],
  cbms: [
    { id: "DC CBM#1", state: "CLOSED", voltage: 1328, current: 1092, imd: "2,84 MΩ" },
    { id: "DC CBM#2", state: "CLOSED", voltage: 1324, current: 664, imd: "3,12 MΩ" },
  ],
  pcs: [
    { id: "PCS 1A", state: "Discharging", power: "1,42 MW", tone: "success" },
    { id: "PCS 1B", state: "Limited 50 %", power: "0,86 MW", tone: "warning" },
  ],
  rmu: {
    title: "RMU",
    state: "CLOSED",
    lines: ["H01 LBS in", "H02 CB motor", "H03 LBS out", "ES open"],
    values: [
      { label: "34,5", value: "kV" },
      { label: "630", value: "A" },
    ],
  },
  trafo: {
    title: "TR 3 750kVA",
    voltage: "34,5/0,69kV",
    vector: "Dy11y11",
  },
  panel: {
    temperature: 24,
    subtitle: "Control panel · FSS",
    scalePct: 62,
    footerLeft: "FSS normal · H2 0,3 %LEL",
    footerRight: "38 %rh",
  },
  rooms: [
    {
      key: "r1",
      label: "Room 1",
      range: "R1–R4",
      temperature: 21.4,
      dots: ["success", "success", "warning", "success"],
      scalePct: 43,
      supply: 18.5,
      ret: 26.2,
      humidity: 41,
      chips: [
        { label: "H1", pct: 64 },
        { label: "H2", pct: 64 },
      ],
    },
    {
      key: "r2",
      label: "Room 2",
      range: "R5–R8",
      temperature: 22.8,
      dots: ["success", "success", "success", "critical"],
      scalePct: 44,
      supply: 18.5,
      ret: 26.4,
      humidity: 42,
      chips: [
        { label: "H3", pct: 64 },
        { label: "H4", pct: 64 },
      ],
    },
    {
      key: "r3",
      label: "Room 3",
      range: "R9–R12",
      temperature: 27.1,
      overTemp: true,
      dots: ["success", "success", "success", "success"],
      scalePct: 66,
      supply: 18.5,
      ret: 28.9,
      humidity: 44,
      chips: [
        { label: "H5", pct: 64 },
        { label: "H6", pct: 64 },
      ],
    },
    {
      key: "r4",
      label: "Room 4",
      range: "R13–R16",
      temperature: 21.9,
      dots: ["success", "success", "success", "success"],
      scalePct: 44,
      supply: 18.5,
      ret: 26.3,
      humidity: 40,
      chips: [
        { label: "H7", pct: 64 },
        { label: "H8", pct: 64 },
      ],
    },
  ],
  events: [
    {
      id: "e1",
      time: "12.10 · 14:31:52",
      severity: "warning",
      source: "Room 3",
      message: "Air temperature 27,1 °C is above the 26,0 °C limit",
      status: "Active",
    },
    {
      id: "e2",
      time: "12.10 · 14:31:40",
      severity: "warning",
      source: "Rack#11",
      message: "Rack temperature 28,6 °C above 28 °C · PCS-3B limited to 50 %",
      status: "Active",
    },
    {
      id: "e3",
      time: "12.10 · 14:28:06",
      severity: "critical",
      source: "Rack#8",
      message: "Rack fault. String isolated at the rack fuse",
      status: "Active",
    },
    {
      id: "e4",
      time: "12.10 · 14:27:58",
      severity: "info",
      source: "BSC#1",
      message: "Racks online changed to 6 of 8",
      status: "—",
    },
    {
      id: "e5",
      time: "12.10 · 14:05:02",
      severity: "info",
      source: "PMS",
      message: "FL-02 discharge 2,84 MW started · rest complete",
      status: "—",
    },
    {
      id: "e6",
      time: "12.10 · 13:58:10",
      severity: "warning",
      source: "Rack#3",
      message: "Cell voltage deviation 38 mV",
      status: "Active",
    },
    {
      id: "e7",
      time: "12.10 · 13:40:02",
      severity: "info",
      source: "HVAC-3.5",
      message: "Compressor 64 % · cooling (synchronised)",
      status: "—",
    },
    {
      id: "e8",
      time: "12.10 · 13:40:02",
      severity: "info",
      source: "HVAC-3.2",
      message: "Compressor 64 % · cooling (synchronised)",
      status: "—",
    },
  ],
  states: [
    {
      key: "bsc1",
      title: "BSC#1 state",
      badge: { tone: "critical", label: "ALARM" },
      rows: [
        { key: "state", label: "BSC state", value: "Alarm · Rack#9 fault", tone: "critical" },
        { key: "racks", label: "Racks online", value: "6 / 8", tone: "critical" },
        { key: "soc", label: "SOC · SOH", value: "72,4 % · 97,8 %" },
        { key: "dc", label: "DC bus", value: "1328 V · 1092 A" },
        { key: "power", label: "Power (PCS 1A)", value: "Discharging · 1,42 MW", tone: "warning" },
        { key: "limit", label: "Chg / dis limit", value: "1,73 / 1,61 MW" },
        { key: "cellt", label: "Cell T max · min", value: "23,8 · 21,2 °C" },
        { key: "cellv", label: "Cell V max · min", value: "3 251 · 3 213 mV" },
        { key: "imd", label: "Insulation · IMD", value: "2,84 MΩ" },
      ],
    },
    {
      key: "bsc2",
      title: "BSC#2 state",
      badge: { tone: "warning", label: "WARNING" },
      rows: [
        { key: "state", label: "BSC state", value: "Warning · Rack#11 hot", tone: "warning" },
        { key: "racks", label: "Racks online", value: "8 / 8" },
        { key: "soc", label: "SOC · SOH", value: "70,9 % · 97,6 %" },
        { key: "dc", label: "DC bus", value: "1324 V · 664 A" },
        { key: "power", label: "Power (PCS 1B)", value: "Limited 50 % · 0,86 MW", tone: "warning" },
        { key: "limit", label: "Chg / dis limit", value: "1,73 / 1,58 MW" },
        { key: "cellt", label: "Cell T max · min", value: "28,6 · 21,9 °C" },
        { key: "cellv", label: "Cell V max · min", value: "3 258 · 3 246 mV" },
        { key: "imd", label: "Insulation · IMD", value: "3,12 MΩ" },
      ],
    },
  ],
};
