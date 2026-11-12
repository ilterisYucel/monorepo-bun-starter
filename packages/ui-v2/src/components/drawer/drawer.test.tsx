import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../theme";
import { ContainerDrawer } from "./ContainerDrawer";
import type { ContainerDrawerProps } from "./types";

const wrap = (node: React.ReactNode) => render(<ThemeProvider mode="light">{node}</ThemeProvider>);

const props: ContainerDrawerProps = {
  title: "BESS#3",
  stateBadge: { tone: "success", label: "Ready" },
  modeBadge: { tone: "info", label: "Discharge · 2/2 PCS" },
  feeder: "Feeder A · position 3 · 40 ft · 3,568 MWh × 2",
  actions: ["Stop", "Reset"],
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
    cells: [
      { cma: "CMA 4", index: 1, value: 64 },
      { cma: "CMA 4", index: 2, value: 65, tone: "warning" },
      { cma: "CMA 3", index: 1, value: 63 },
      { cma: "CMA 2", index: 1, value: 62 },
      { cma: "CMA 1", index: 1, value: 66, tone: "critical" },
    ],
    hardware: [{ label: "NTC", value: "4" }],
  },
  rmu: [
    { id: "H01", state: "CLOSED", tone: "success" },
    { id: "H02", state: "OPEN", tone: "warning" },
  ],
  pcs: [{ id: "PCS 1A", state: "Discharging", power: "1,42 MW", acVoltage: "690 V", tone: "success" }],
  banks: [
    { id: "Bank A", soc: 72.4, soh: 97.8, voltage: 1328, current: 546, temperature: 23.8 },
    { id: "Bank B", soc: 70.9, soh: 97.6, voltage: 1324, current: 546, temperature: 28.6, high: true },
  ],
};

describe("ContainerDrawer", () => {
  it("başlık, rozetler, feeder ve aksiyonları gösterir", () => {
    wrap(<ContainerDrawer {...props} />);
    expect(screen.getByRole("heading", { name: "BESS#3" })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Discharge · 2/2 PCS")).toBeInTheDocument();
    expect(screen.getByText(props.feeder)).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("seçili rack, pack, RMU, PCS ve bank bölümlerini render eder", () => {
    wrap(<ContainerDrawer {...props} />);
    expect(screen.getByText("Selected rack · Rack#4")).toBeInTheDocument();
    expect(screen.getByText("Selected pack P16")).toBeInTheDocument();
    expect(screen.getByText("RMU positions")).toBeInTheDocument();
    expect(screen.getByText("H01")).toBeInTheDocument();
    expect(screen.getByText("PCS 1A · 690 V")).toBeInTheDocument();
    expect(screen.getByText("Bank A")).toBeInTheDocument();
    expect(screen.getByText("Bank B")).toBeInTheDocument();
  });

  it("kapatma ve EMS görünümü callback'lerini tetikler", () => {
    const onClose = vi.fn();
    const onOpenEms = vi.fn();
    wrap(<ContainerDrawer {...props} onClose={onClose} onOpenEms={onOpenEms} />);
    fireEvent.click(screen.getByRole("button", { name: "Drawer'ı kapat" }));
    fireEvent.click(screen.getByRole("button", { name: /Open EMS view/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenEms).toHaveBeenCalledTimes(1);
  });

  it("acil durdurma callback'i tetikler", () => {
    const onStop = vi.fn();
    wrap(<ContainerDrawer {...props} onEmergencyStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: /Emergency stop/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
