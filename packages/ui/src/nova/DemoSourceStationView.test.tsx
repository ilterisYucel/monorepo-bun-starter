import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoSourceStationView } from "./DemoSourceStationView";
import type { PlantSourceView } from "./demo-plant";

/**
 * PV MV istasyonu tek-hat çizimi — SPEC UC-11 AK-11.10.
 */
const station: PlantSourceView = {
  index: 0,
  key: "src1",
  name: "PV MV STATION #1",
  n: 7,
  unitMVA: 4.3,
  mw: 22.0,
  unitMW: [22.0 / 7, 22.0 / 7, 22.0 / 7, 22.0 / 7, 22.0 / 7, 22.0 / 7, 22.0 / 7],
};

describe("DemoSourceStationView", () => {
  it("AK-11.10: başlık + srcKpi + 7 inverter çizimi", () => {
    const { container } = render(
      <DemoSourceStationView station={station} prefix="INV" collectorName="Metal Clad" collectorCell="Q06" />,
    );
    expect(screen.getByText("PV MV STATION #1")).toBeTruthy();
    expect(screen.getByText("Output")).toBeTruthy();
    expect(screen.getByText("Irradiance")).toBeTruthy();
    expect(screen.getByText("Units running")).toBeTruthy();
    expect(container.querySelectorAll("rect.po-inv")).toHaveLength(7);
    expect(screen.getByText("INV-01")).toBeTruthy();
    expect(screen.getByText("INV-07")).toBeTruthy();
    expect(screen.getByText(/TO METAL CLAD Q06/)).toBeTruthy();
  });
});
