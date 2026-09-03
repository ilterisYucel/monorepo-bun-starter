import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./Sparkline";
import type { SparklinePoint } from "./Sparkline.types";

/**
 * Sparkline sözleşmesi (2026-09-02 — recharts → uPlot geçişi):
 * - data boş/tek elemanlı davranışı: boşta uPlot kurulmaz; veriyle kurulur.
 * - Girdi sıralanır (kopya üzerinde — girdi mutate edilmez); geçersiz
 *   tarihli/sayısal olmayan noktalar atlanır.
 * - uPlot opts: axes boş, legend/cursor kapalı, x zaman skalası, seri
 *   stroke = color prop'u, fill = CanvasGradient.
 * - data değişince yeni instance kurulmaz — setData çağrılır.
 * - Unmount'ta destroy çağrılır (kaynak temizliği).
 */

const mocks = vi.hoisted(() => {
  class MockUPlot {
    static instances: MockUPlot[] = [];
    static lastOpts: any;
    static lastRoot: HTMLElement | null = null;
    setData = vi.fn();
    setSize = vi.fn();
    destroy = vi.fn();
    constructor(opts: unknown, _data: unknown, root: HTMLElement) {
      MockUPlot.lastOpts = opts;
      MockUPlot.lastRoot = root;
      MockUPlot.instances.push(this);
    }
  }
  return { MockUPlot };
});

vi.mock("uplot", () => ({
  default: mocks.MockUPlot,
}));

const points: SparklinePoint[] = [
  { time: "2026-09-01T10:00:00.000Z", value: 50 },
  { time: "2026-09-01T11:00:00.000Z", value: 55 },
  { time: "2026-09-01T12:00:00.000Z", value: 53 },
];

describe("Sparkline @ui-chart", () => {
  beforeEach(() => {
    mocks.MockUPlot.instances = [];
    mocks.MockUPlot.lastOpts = undefined;
    mocks.MockUPlot.lastRoot = null;
    vi.clearAllMocks();
  });

  it("boş data'da uPlot kurulmaz", () => {
    render(<Sparkline data={[]} color="#10b981" />);
    expect(mocks.MockUPlot.instances.length).toBe(0);
  });

  it("veriyle uPlot kurulur ve sparkline opts'ları taşır", () => {
    render(<Sparkline data={points} color="#10b981" height={46} />);
    expect(mocks.MockUPlot.instances.length).toBe(1);

    const opts = mocks.MockUPlot.lastOpts;
    expect(opts).toBeDefined();
    expect(opts.axes).toEqual([]);
    expect(opts.legend).toEqual({ show: false });
    expect(opts.cursor).toEqual({ show: false });
    expect(opts.scales).toMatchObject({ x: { time: true }, y: { auto: true } });
    expect(opts.height).toBe(46);

    const series = opts.series;
    expect(series.length).toBe(2);
    expect(series[1].stroke).toBe("#10b981");
    expect(series[1].width).toBe(1.5);
    expect(typeof series[1].fill).toBe("function");
  });

  it("fill fonksiyonu dikey CanvasGradient döner (üst 0.35 → alt 0.02)", () => {
    const addColorStop = vi.fn();
    const fakeCtx = {
      createLinearGradient: vi.fn(
        () => ({ addColorStop } as unknown as CanvasGradient),
      ),
    };
    const fakeUPlot = {
      bbox: { top: 0, height: 46 },
      ctx: fakeCtx,
    };
    render(<Sparkline data={points} color="#10b981" />);

    const fill = mocks.MockUPlot.lastOpts.series[1].fill as (
      u: unknown,
    ) => CanvasGradient;
    const gradient = fill(fakeUPlot);

    expect(fakeCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 46);
    expect(addColorStop).toHaveBeenCalledWith(0, "rgba(16, 185, 129, 0.35)");
    expect(addColorStop).toHaveBeenCalledWith(1, "rgba(16, 185, 129, 0.02)");
    expect(gradient).toBeDefined();
  });

  it("data değişince yeni instance kurulmaz — setData çağrılır", () => {
    const { rerender } = render(
      <Sparkline data={points} color="#10b981" />,
    );
    expect(mocks.MockUPlot.instances.length).toBe(1);

    rerender(
      <Sparkline
        data={[
          { time: "2026-09-01T13:00:00.000Z", value: 60 },
          { time: "2026-09-01T14:00:00.000Z", value: 62 },
        ]}
        color="#10b981"
      />,
    );
    expect(mocks.MockUPlot.instances.length).toBe(1);
    expect(mocks.MockUPlot.instances[0]!.setData).toHaveBeenCalledTimes(1);
  });

  it("girdi mutate edilmez ve veri zamana göre sıralanır", () => {
    const unsorted: SparklinePoint[] = [
      { time: "2026-09-01T12:00:00.000Z", value: 53 },
      { time: "2026-09-01T10:00:00.000Z", value: 50 },
      { time: "2026-09-01T11:00:00.000Z", value: 55 },
    ];
    const before = JSON.stringify(unsorted);
    render(<Sparkline data={unsorted} color="#10b981" />);
    expect(JSON.stringify(unsorted)).toBe(before);

    const opts = mocks.MockUPlot.lastOpts;
    expect(typeof opts.series[1].fill).toBe("function");
  });

  it("geçersiz tarihli ve sayısal olmayan noktalar seriden atlanır", () => {
    render(
      <Sparkline
        data={[
          { time: "2026-09-01T10:00:00.000Z", value: 50 },
          { time: "gecersiz", value: 99 },
          { time: "2026-09-01T12:00:00.000Z", value: 53 },
        ]}
        color="#10b981"
      />,
    );
    expect(mocks.MockUPlot.instances.length).toBe(1);
  });

  it("unmount'ta destroy çağrılır", () => {
    const { unmount } = render(<Sparkline data={points} color="#10b981" />);
    unmount();
    expect(mocks.MockUPlot.instances[0]!.destroy).toHaveBeenCalledTimes(1);
  });
});
