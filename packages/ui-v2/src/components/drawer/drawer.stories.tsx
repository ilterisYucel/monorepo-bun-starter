import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "../../theme";
import { ContainerDrawer } from "./ContainerDrawer";
import type { ContainerDrawerProps } from "./types";

const props: ContainerDrawerProps = {
  title: "BESS#3",
  stateBadge: { tone: "success", label: "Ready" },
  modeBadge: { tone: "info", label: "Discharge · 2/2 PCS" },
  feeder: "Feeder A · position 3 · 40 ft · 3,568 MWh × 2",
  actions: ["Stop", "Reset", "Cooling 64 %"],
  rack: {
    id: "Rack#4",
    soc: 72.4,
    soh: 97.8,
    temperature: 23.8,
    voltage: 1328,
    current: 1092,
    cellTempMax: 23.8,
    cellTempMin: 21.2,
    cellVoltageMax: 3251,
    cellVoltageMin: 3213,
  },
  pack: {
    id: "P16",
    cells: Array.from({ length: 24 }, (_, index) => ({
      cma: `CMA ${4 - Math.floor(index / 6)}`,
      index: index % 6,
      value: 60 + (index % 8),
      tone: index % 11 === 0 ? ("warning" as const) : ("normal" as const),
    })),
    hardware: [
      { label: "NTC", value: "4 × film" },
      { label: "Fuse", value: "350 A" },
    ],
  },
  rmu: [
    { id: "H01", state: "CLOSED", tone: "success" },
    { id: "H03", state: "OPEN", tone: "warning" },
  ],
  pcs: [{ id: "PCS 1A", state: "Discharging", power: "1,42 MW", acVoltage: "690 V", tone: "success" }],
  banks: [
    { id: "Bank A", soc: 72.4, soh: 97.8, voltage: 1328, current: 546, temperature: 23.8 },
    { id: "Bank B", soc: 70.9, soh: 97.6, voltage: 1324, current: 546, temperature: 28.6, high: true },
  ],
};

const meta: Meta = {
  title: "Drawer/ContainerDrawer",
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

export const Default: Story = {
  render: () => <ContainerDrawer {...props} />,
};
