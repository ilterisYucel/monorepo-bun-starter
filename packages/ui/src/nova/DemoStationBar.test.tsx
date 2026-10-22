import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoStationBar } from "./DemoStationBar";

/**
 * İstasyon barı (stBar) — SPEC UC-11 AK-11.8.
 */
const stations = [
  { index: 0, name: "BESS MV STATION #1", first: 1, last: 5, faults: 0 },
  { index: 1, name: "BESS MV STATION #2", first: 6, last: 9, faults: 2 },
];

describe("DemoStationBar", () => {
  it("tek istasyonda render etmez", () => {
    const { container } = render(<DemoStationBar stations={[stations[0]]} active={0} onSelect={() => {}} />);
    expect(container.querySelector(".stbar")).toBeNull();
  });

  it("istasyon adı + grup aralığı + seg + arıza gösterir", () => {
    render(<DemoStationBar stations={stations} active={0} onSelect={() => {}} />);
    expect(screen.getByText("BESS MV STATION #1")).toBeTruthy();
    expect(screen.getByText(/BESS#1–5/)).toBeTruthy();
    expect(screen.getByText(/2 faults/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /BESS MV St\. #1/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("seçim callback çağırır", () => {
    const onSelect = vi.fn();
    render(<DemoStationBar stations={stations} active={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /BESS MV St\. #2/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
