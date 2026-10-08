import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DemoTrendChart, nearestIndex } from "./DemoTrendChart";
import type { TrendSeries } from "./DemoTrendChart";

const line = (t: number, value: number) => ({ t, value });

describe("DemoTrendChart (UC-3)", () => {
  it("AK-3.1: faz gölgelemesi + etiketi çizer", () => {
    const series: TrendSeries[] = [
      { label: "SOC", color: "var(--nm-c-soc)", points: [line(0, 10), line(100, 20)] },
    ];
    const { container } = render(
      <DemoTrendChart
        title="SOC"
        unit="%"
        series={series}
        yMin={0}
        yMax={100}
        phases={[
          { t0: 10, t1: 60, kind: "rest" },
          { t0: 70, t1: 90, kind: "cool" },
        ]}
        shade={["rest"]}
        shadeLabel={{ rest: "Rest" }}
      />,
    );
    expect(container.querySelectorAll("rect.tc-phase")).toHaveLength(1);
    expect(container.querySelector(".tc-phl")?.textContent).toBe("Rest");
  });

  it("AK-3.2: band + area + limit çizilir", () => {
    const series: TrendSeries[] = [
      { label: "Band", color: "var(--nm-c-soc)", band: { lower: [line(0, 5), line(100, 6)], upper: [line(0, 15), line(100, 16)] } },
      { label: "Power", color: "var(--nm-c-pow)", area: true, points: [line(0, -2), line(50, 4), line(100, 1)] },
    ];
    const { container } = render(
      <DemoTrendChart
        title="P"
        unit="MW"
        series={series}
        limits={[{ value: 3, label: "Upper", cls: "hot" }]}
        yMin={0}
        yMax={20}
      />,
    );
    expect(container.querySelector("polygon.tc-band")).toBeTruthy();
    expect(container.querySelector("polygon.tc-area")).toBeTruthy();
    expect(container.querySelector("line.tc-limit.hot")).toBeTruthy();
  });

  it("AK-3.3: hover crosshair + nokta + tooltip", () => {
    const series: TrendSeries[] = [
      { label: "SOC", color: "var(--nm-c-soc)", points: [line(0, 10), line(100, 20)] },
    ];
    const { container } = render(
      <DemoTrendChart title="SOC" unit="%" series={series} yMin={0} yMax={100} />,
    );
    const svg = container.querySelector("svg")!;
    fireEvent.pointerMove(svg, { clientX: 100, clientY: 20 });
    expect(container.querySelector("line.tc-cross")).toBeTruthy();
    expect(container.querySelector("circle.tc-dot")).toBeTruthy();
    expect(container.querySelector(".tc-tip")).toBeTruthy();
  });

  it("seri boşsa 'No data' gösterir", () => {
    const { container } = render(<DemoTrendChart title="x" unit="%" series={[]} />);
    expect(container.querySelector(".tc-empty")?.textContent).toBe("No data");
  });
});

describe("nearestIndex", () => {
  it("en yakın örneği bulur", () => {
    const pts = [line(0, 1), line(10, 2), line(20, 3)];
    expect(nearestIndex(pts, 11)).toBe(1);
    expect(nearestIndex(pts, 19)).toBe(2);
  });
});
