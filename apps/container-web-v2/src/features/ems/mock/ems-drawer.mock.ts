import type { ContainerDrawerProps, PackCell } from "@gd-monorepo/ui-v2";

const buildPack = (base: number): PackCell[] => {
  const cmas = ["CMA 4", "CMA 3", "CMA 2", "CMA 1"];
  const cells: PackCell[] = [];
  cmas.forEach((cma, cmaIndex) => {
    for (let index = 1; index <= 18; index += 1) {
      const value = base - cmaIndex * 0.4 + ((index * 7) % 5) * 0.3;
      const tone = value > base + 0.8 ? "warning" : value < base - 0.9 ? "critical" : "normal";
      cells.push({ cma, index, value, tone });
    }
  });
  return cells;
};

export const EMS_DRAWER: Omit<ContainerDrawerProps, "onClose" | "onOpenEms" | "onEmergencyStop"> = {
  title: "BESS#3",
  stateBadge: { tone: "success", label: "Ready" },
  modeBadge: { tone: "info", label: "Discharge · 2/2 PCS" },
  feeder: "Feeder A · position 3 · 40 ft · 3,568 MWh × 2 · 2 × 1,725 MVA · TR 3 750 kVA 34,5/0,69 kV",
  actions: ["Stop", "Reset", "Isolate", "Cooling 64 %"],
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
    cells: buildPack(64),
    hardware: [
      { label: "NTC", value: "4 × film" },
      { label: "Fuse", value: "350 A" },
      { label: "Contactor", value: "CLOSED" },
      { label: "Balancer", value: "ON" },
    ],
  },
  rmu: [
    { id: "H01", state: "CLOSED", tone: "success" },
    { id: "H02", state: "CLOSED", tone: "success" },
    { id: "H03", state: "OPEN", tone: "warning" },
  ],
  pcs: [
    { id: "PCS 1A", state: "Discharging", power: "1,42 MW", acVoltage: "690 V", tone: "success" },
    { id: "PCS 1B", state: "Limited 50 %", power: "0,86 MW", acVoltage: "690 V", tone: "warning" },
  ],
  banks: [
    { id: "Bank A", soc: 72.4, soh: 97.8, voltage: 1328, current: 546, temperature: 23.8 },
    { id: "Bank B", soc: 70.9, soh: 97.6, voltage: 1324, current: 546, temperature: 28.6, high: true },
  ],
};
