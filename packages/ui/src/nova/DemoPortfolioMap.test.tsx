import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DemoPortfolioMap,
  type DemoPortfolioSite,
} from "./DemoPortfolioMap";

const sites: DemoPortfolioSite[] = [
  {
    i: 0,
    id: "GDE-202030",
    name: "GD-1",
    lat: 39.58,
    lon: 32.15,
    live: true,
    status: "dis",
    tip: {
      subtitle: "Polatlı, Ankara",
      rows: [{ label: "Power at POI", value: "12.00 MW", cls: "c-dis" }],
      footer: "Click to open the project",
    },
  },
  {
    i: 1,
    id: "GDE-202050",
    name: "GD-2",
    lat: 37.03,
    lon: 30.6,
    live: false,
    status: "idle",
    tip: {
      subtitle: "Antalya",
      rows: [{ label: "Power at POI", value: "41.20 MW" }],
      footer: "Demo project — not live",
    },
  },
];

/**
 * UC-11 (FR-11.2/FR-11.3/FR-11.4/FR-11.5) — portföy haritası:
 * iki marker, canlı/statik ayrımı, hover tip kartı, canlı seçim callback'i.
 */
describe("DemoPortfolioMap (UC-11)", () => {
  it("AK-11.2: iki proje marker'ı render eder", () => {
    render(<DemoPortfolioMap sites={sites} />);
    expect(screen.getByText(/GD-1/)).toBeTruthy();
    expect(screen.getByText(/GD-2/)).toBeTruthy();
    expect(screen.getByTestId("demo-portfolio-map")).toBeTruthy();
  });

  it("AK-11.3: statik proje 'demo' işaretlidir", () => {
    const { container } = render(<DemoPortfolioMap sites={sites} />);
    const demo = container.querySelector('[data-site="1"]');
    expect(demo?.getAttribute("class")).toContain("demo");
    const live = container.querySelector('[data-site="0"]');
    expect(live?.getAttribute("class")).toContain("dis");
    expect(live?.getAttribute("class")).not.toContain("demo");
  });

  it("AK-11.4: hover'da tip kartı satırları görünür", () => {
    const { container } = render(<DemoPortfolioMap sites={sites} />);
    fireEvent.pointerOver(container.querySelector('[data-site="0"]')!);
    const tip = screen.getByTestId("demo-portfolio-tip");
    expect(tip).toBeTruthy();
    expect(tip.textContent).toContain("Power at POI");
    expect(tip.textContent).toContain("12.00 MW");
  });

  it("AK-11.5: canlı proje tıklaması onOpen çağırır, statik çağırmaz", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <DemoPortfolioMap sites={sites} onOpen={onOpen} />,
    );
    fireEvent.click(container.querySelector('[data-site="0"]')!);
    expect(onOpen).toHaveBeenCalledWith(0);
    fireEvent.click(container.querySelector('[data-site="1"]')!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("zoom kontrolleri mevcuttur", () => {
    render(<DemoPortfolioMap sites={sites} />);
    expect(screen.getByLabelText("Zoom in")).toBeTruthy();
    expect(screen.getByLabelText("Zoom out")).toBeTruthy();
    expect(screen.getByLabelText("Zoom to the projects")).toBeTruthy();
    expect(screen.getByLabelText("Reset view")).toBeTruthy();
  });
});
