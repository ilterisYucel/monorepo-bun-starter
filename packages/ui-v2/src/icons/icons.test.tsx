import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { EMS_ICONS } from "./EMS_ICONS";
import type { EmsIconName } from "./EMS_ICONS";

const EXPECTED: EmsIconName[] = [
  "dashboard",
  "rackDetails",
  "control",
  "analytics",
  "reports",
  "history",
  "emergencyStop",
  "info",
  "search",
  "download",
  "rackGlyph",
  "close",
];

describe("EMS_ICONS", () => {
  it("EMS ekranlarının ihtiyaç duyduğu 12 ikonu içerir", () => {
    expect(Object.keys(EMS_ICONS).sort()).toEqual([...EXPECTED].sort());
    for (const name of EXPECTED) {
      expect(typeof EMS_ICONS[name]).toBe("function");
    }
  });

  it("size prop'u svg boyutuna yansır", () => {
    const { container } = render(<EMS_ICONS.dashboard size={16} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("tek renkli ikonlar currentColor kullanır", () => {
    const { container } = render(<EMS_ICONS.search />);
    const strokes = Array.from(container.querySelectorAll("[stroke], [fill]"))
      .map((el) => el.getAttribute("stroke") ?? el.getAttribute("fill"))
      .filter((value) => value && value !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes.every((value) => value === "currentColor")).toBe(true);
  });

  it("çok renkli rack ikonu tasarım renklerini korur", () => {
    const { container } = render(<EMS_ICONS.rackGlyph />);
    const html = container.innerHTML;
    expect(html).toContain("#F57818");
    expect(html).toContain("#2F3A4F");
  });

  it("erişilebilirlik: dekoratif ikon aria-hidden verilebilir", () => {
    const { container } = render(<EMS_ICONS.info aria-hidden="true" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
