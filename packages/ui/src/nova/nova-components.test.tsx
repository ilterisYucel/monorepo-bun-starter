import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoCellDialog } from "./DemoCellDialog";
import { DemoUnitDetail } from "./DemoUnitDetail";
import type { NovaCellConfig, NovaStationState, NovaTopology, NovaUnitState } from "./mimic-types";

const station = (over: Partial<NovaStationState> = {}): NovaStationState => ({
  H01: "closed",
  H02: "closed",
  H04: "closed",
  H05: "closed",
  kV: 34.5,
  hz: 50,
  es: { H01: false, H04: false, H05: false },
  iA: { H01: 120, H03: 120, H04: 60, H05: 60 },
  ...over,
});

const cbCell: NovaCellConfig = { id: "H05", label: "Fider A kesici", kind: "cb", role: "feeder", feeder: "A", es: true, ct: "300/5" };
const vtCell: NovaCellConfig = { id: "H03", label: "Ölçü", kind: "vt", role: "measurement", ct: "750/5" };

describe("DemoCellDialog (FR-4.4 / AK-4.4)", () => {
  it("ölçü hücresinde V/Hz/I gösterir", () => {
    render(<DemoCellDialog cell={vtCell} station={station()} onClose={() => {}} />);
    expect(screen.getByText("34,50 kV")).toBeTruthy();
    expect(screen.getByText("50,00 Hz")).toBeTruthy();
    expect(screen.getByText("120 A")).toBeTruthy();
  });

  it("toprak kapalıyken kesici kapatmayı kilitler (AK-4.5)", () => {
    render(
      <DemoCellDialog
        cell={cbCell}
        station={station({ es: { H01: false, H04: false, H05: true } })}
        onClose={() => {}}
      />,
    );
    const closeBtn = screen.getByRole("button", { name: /Kesiciyi kapat/ });
    expect((closeBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("geçerli komutta onCommand'ı çağırır", () => {
    const onCommand = vi.fn();
    render(
      <DemoCellDialog cell={cbCell} station={station()} onClose={() => {}} onCommand={onCommand} />,
    );
    const openBtn = screen.getByRole("button", { name: /Kesiciyi aç/ });
    openBtn.click();
    expect(onCommand).toHaveBeenCalledWith("H05", "cb_open");
  });
});

const unit: NovaUnitState = {
  n: 3,
  rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
  banks: [
    { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 24, dvmV: 10, racks: [24, 23], dcb: "closed" },
    { id: "B", soc: 55, soh: 97, vdc: 1290, tmax: 23, dvmV: 12, racks: [23, 22], dcb: "closed" },
  ],
  pcs: [
    { id: "A", state: "dis", pMW: 0.2, igbtC: 45, limited: false },
    { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false },
  ],
};

const topo = { limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 }, unit: { banks: ["A", "B"] } } as unknown as NovaTopology;

describe("DemoUnitDetail (FR-4.3 / AK-4.3)", () => {
  it("2 PCS ve 2 banka tablosu gösterir", () => {
    render(<DemoUnitDetail unit={unit} topology={topo} />);
    expect(screen.getByText("BESS#3")).toBeTruthy();
    expect(screen.getByText("PCS-3A")).toBeTruthy();
    expect(screen.getByText("PCS-3B")).toBeTruthy();
    expect(screen.getByText("Banka A")).toBeTruthy();
    expect(screen.getByText("Banka B")).toBeTruthy();
  });
});
