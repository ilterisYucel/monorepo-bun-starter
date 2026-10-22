import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoPackSchematic, type DemoPackSpec } from "./DemoPackSchematic";
import type { PackInput } from "./demo-bess-data";

/**
 * Pack şeması — SPEC UC-13 DEV (referans `devices.js#packSvg` portu).
 */
const spec: DemoPackSpec = {
  model: "EP077170PCB2",
  name: "Grid JF1 1CP Pack",
  config: "3P24S",
  cells: 72,
  cma: { count: 4, config: "3P6S", cells: 18 },
  capAh: 169.8,
  vNom: 77.28,
  kWh: 13.122,
  vChgEnd: 87.6,
  vDisEnd: 64.8,
  iStd: 42.5,
  iEnd: 8.5,
  pMaxKW: 13.122,
  iPeak: 218.7,
  restAfterChgH: 2,
  restAfterDisH: 8,
  dielectricKV: 4.15,
  ip: "IP20",
  opAmbC: [15, 30],
  recC: "23 ± 4",
  dimMM: { depth: 1357.4, width: 437, widthMtg: 475, height: 114.4 },
  kg: 107,
  bms: "Gen3 PBMS",
  cooling: "Air (front fan)",
  cell: { name: "JF1", capAh: [56.6, 59.5], vNom: 3.22, vRange: [2.5, 3.65], wh: 182.25, dcirMOhm: [1.261, 2.261], g: 1077 },
};

const input: PackInput = { no: 3, soc: 50, soh: 98, v: 1300, temp: 24, tmin: 20, cellsSeries: 408 };

describe("DemoPackSchematic", () => {
  it("4 × CMA 3P6S şeması + 72 hücre + FRONT bloğu render eder", () => {
    const { container } = render(
      <DemoPackSchematic rackNo={3} input={input} packIndex={0} spec={spec} />,
    );
    expect(screen.getByTestId("pack-schematic")).toBeTruthy();
    expect(container.querySelectorAll("rect.pk-cma")).toHaveLength(4);
    expect(container.querySelectorAll("rect.pk-cell")).toHaveLength(72);
    expect(screen.getByText(/CMA 1 · 3P6S · S1–S6/)).toBeTruthy();
    expect(screen.getByText(/Grid JF1 1CP Pack EP077170PCB2 · 3P24S/)).toBeTruthy();
    expect(screen.getByText("FRONT")).toBeTruthy();
    expect(screen.getByText("PBMS")).toBeTruthy();
  });

  it("spec tablosu + not-in-map listesi + live kayıt bölümü", () => {
    render(<DemoPackSchematic rackNo={3} input={input} packIndex={0} spec={spec} />);
    expect(screen.getByText("Pack specification · LGES Rev AE")).toBeTruthy();
    expect(screen.getByText("Not in the BSC Modbus map")).toBeTruthy();
    expect(screen.getByText("Live · BSC registers that point to this pack")).toBeTruthy();
    expect(screen.getByText(/3P24S = 72 cells/)).toBeTruthy();
  });

  it("packIndex ile pack başlığı değişir", () => {
    render(<DemoPackSchematic rackNo={3} input={input} packIndex={4} spec={spec} />);
    expect(screen.getByText(/Pack P05 · Rack#3/)).toBeTruthy();
  });
});
