import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RackCard } from "./RackCard";
import type { RackCardLabels } from "./RackCard.types";

/**
 * RackCard sözleşmesi (2026-08-30 — T4):
 * - Rack verileri (name/soc/voltage/power) görünür; SoC bar genişliği %'ye
 *   göre kırpılır (0-100).
 * - onDetailClick verilirse "Detay" butonu render edilir ve tıklamada
 *   çağrılır; verilmezse buton YOKTUR.
 * - labels prop'u varsayılan metinleri değiştirir (i18n dışarıdan).
 */

const rack = {
  id: 1,
  deviceId: "BSC-1",
  name: "Rack 1",
  status: "online" as const,
  charge_status: "Charge" as const,
  soc: 85,
  soh: 95,
  voltage: 748,
  current: 120,
  power_kw: 45.2,
  temperature: 32,
};

const labels: RackCardLabels = {
  online: "Cevrimici",
  offline: "Cevrimdisi",
  charging: "Sarj",
  discharging: "Desarj",
  idle: "Bekleme",
  voltage: "Gerilim",
  current: "Akim",
  power: "Guc",
  temperature: "Sicaklik",
  detail: "Detaya Git",
};

describe("RackCard (T4)", () => {
  it("temel metrikleri gösterir (SoC/SoH/Güç/Voltaj)", () => {
    render(<RackCard {...rack} labels={labels} />);
    expect(screen.getByText("Rack 1")).toBeTruthy();
    expect(screen.getByText("85.0%")).toBeTruthy();
    expect(screen.getByText("45.2 kW")).toBeTruthy();
    expect(screen.getByText("748.0 V")).toBeTruthy();
    expect(screen.getByText("95.0 %")).toBeTruthy();
    expect(screen.getByText("Cevrimici")).toBeTruthy();
  });

  it("SoC % değeri 0-100 arasına kırpılır", () => {
    render(<RackCard {...rack} soc={140} labels={labels} />);
    // SoC bar doluluğu %100'e kırpılmış olur (style inline width)
    const fill = document.querySelector("div[style*='width']");
    expect(fill?.getAttribute("style")).toContain("100%");
  });

  it("onDetailClick verilirse Detay butonu render edilir ve çağrılır", () => {
    const onDetailClick = vi.fn();
    render(<RackCard {...rack} labels={labels} onDetailClick={onDetailClick} />);
    fireEvent.click(screen.getByText("Detaya Git"));
    expect(onDetailClick).toHaveBeenCalledTimes(1);
  });

  it("onDetailClick verilmezse buton render edilmez", () => {
    render(<RackCard {...rack} labels={labels} />);
    expect(screen.queryByText("Detaya Git")).toBeNull();
  });

  it("offline durumda offline etiketi görünür", () => {
    render(<RackCard {...rack} status="offline" labels={labels} />);
    expect(screen.getByText("Cevrimdisi")).toBeTruthy();
  });
});
