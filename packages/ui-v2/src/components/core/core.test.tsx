import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../theme";
import { Alerts } from "./Alerts";
import { BessContainerCard } from "./BessContainerCard";
import type { BessUnit } from "./BessContainerCard";
import { KpiWidget } from "./KpiWidget";

const wrap = (node: React.ReactNode) => render(<ThemeProvider mode="light">{node}</ThemeProvider>);

const allCss = () =>
  Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");

const UNIT: BessUnit = {
  id: "BESS#1",
  status: "normal",
  stateLabel: "DISCHARGE · 2/2 PCS",
  pcs: "2/2 PCS",
  banks: [
    { label: "A", voltage: 1346, soc: 61.4, soh: 97.8, temperature: 22.6 },
    { label: "B", voltage: 1345, soc: 60.9, soh: 97.6, temperature: 21.2 },
  ],
};

describe("BessContainerCard", () => {
  it("V1 satır varyantı iki bankı ve durum etiketini gösterir", () => {
    wrap(<BessContainerCard variant="v1" unit={UNIT} />);
    expect(screen.getByText("BESS#1")).toBeInTheDocument();
    expect(screen.getByText("DISCHARGE · 2/2 PCS")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("1346")).toBeInTheDocument();
  });

  it("V2 ikiz bank varyantı SoC değerlerini biçimlendirir", () => {
    wrap(<BessContainerCard variant="v2" unit={UNIT} />);
    expect(screen.getByText("61,4")).toBeInTheDocument();
    expect(screen.getByText("60,9")).toBeInTheDocument();
    expect(screen.getByText("2/2 PCS")).toBeInTheDocument();
  });

  it("V3 mini plan 8 hücreli iki satır çizer ve Open EMS tetikler", () => {
    const onOpen = vi.fn();
    wrap(<BessContainerCard variant="v3" unit={UNIT} onOpen={onOpen} />);
    expect(screen.getByText("Open EMS ›")).toBeInTheDocument();
    expect(screen.getAllByText("BESS#1")).toHaveLength(1);
    fireEvent.click(screen.getByText("Open EMS ›"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("alarm durumunda kritik kenarlık rengi uygular", () => {
    wrap(
      <BessContainerCard
        variant="v2"
        unit={{ ...UNIT, status: "alarm", stateLabel: "ISOLATED · PCS FAULT" }}
      />,
    );
    expect(allCss()).toContain("#E11D53");
  });
});

describe("KpiWidget", () => {
  it("A varyantı radial gösterge ve değer render eder", () => {
    const { container } = wrap(
      <KpiWidget variant="a" label="Average SOC" value="61,1" unit="%" percent={61} tone="success" />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("61,1")).toBeInTheDocument();
    expect(screen.getByText("Average SOC")).toBeInTheDocument();
  });

  it("B varyantı linear ölçek ve min/max gösterir", () => {
    wrap(
      <KpiWidget
        variant="b"
        label="Site power · POI"
        value="+2,15"
        unit="MW"
        percent={72}
        min="min 0"
        max="max 5 MW"
      />,
    );
    expect(screen.getByText("min 0")).toBeInTheDocument();
    expect(screen.getByText("max 5 MW")).toBeInTheDocument();
  });
});

describe("Alerts", () => {
  const items = [
    {
      id: "1",
      time: "14:31:52",
      severity: "warning" as const,
      source: "Room 3",
      message: "Air temperature is above the limit",
      status: "Active",
      unacknowledged: true,
    },
    {
      id: "2",
      time: "14:30:00",
      severity: "critical" as const,
      source: "Rack#8",
      message: "Rack fault",
      status: "Active",
    },
  ];

  it("A varyantı satırları ve sayaçları gösterir", () => {
    wrap(<Alerts variant="a" items={items} />);
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("Room 3")).toBeInTheDocument();
    expect(screen.getByText("1 unack.")).toBeInTheDocument();
    expect(screen.getByText("View all 2 events ›")).toBeInTheDocument();
  });

  it("B varyantı severity gruplarına ayırır", () => {
    wrap(<Alerts variant="b" items={items} />);
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
  });

  it("C varyantı kartları gösterir", () => {
    wrap(<Alerts variant="c" items={items} />);
    expect(screen.getByText("Rack fault")).toBeInTheDocument();
  });
});
