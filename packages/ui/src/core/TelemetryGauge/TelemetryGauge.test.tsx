import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TelemetryGauge, GAUGE_THEMES } from "./TelemetryGauge";

/**
 * TelemetryGauge tema sözleşmesi (2026-08-28):
 * - Circular: doluluk arc'ı tema paletinden renklenir (pct >= 50 → mid ton).
 * - Linear: BarFill varsayılan olarak tema mid tonunu kullanır; açık `color`
 *   prop'u temayı ezer (geriye dönük uyumluluk).
 * - Varsayılan tema: info (mevcut davranış korunur).
 */

function fillArcStroke(container: HTMLElement): string | null {
  const paths = container.querySelectorAll("path");
  const fill = paths[1];
  return fill?.getAttribute("stroke") ?? null;
}

function barFillElement(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('[style*="background"]');
}

/** jsdom inline style hex'i rgb'ye normalleştirir — karşılaştırma için. */
function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe("TelemetryGauge tema", () => {
  it("circular: success temasında arc, success paletinin mid tonudur", () => {
    const { container } = render(
      <TelemetryGauge
        value={75}
        min={0}
        max={100}
        label="SoC"
        unit="%"
        variant="circular"
        theme="success"
      />,
    );
    expect(fillArcStroke(container)).toBe(GAUGE_THEMES.success.mid);
  });

  it("circular: varsayılan tema info'dur (mevcut davranış)", () => {
    const { container } = render(
      <TelemetryGauge
        value={75}
        min={0}
        max={100}
        label="Güç"
        unit="kW"
        variant="circular"
      />,
    );
    expect(fillArcStroke(container)).toBe(GAUGE_THEMES.info.mid);
  });

  it("circular: %80 ve üzeri koyu tonu kullanır", () => {
    const { container } = render(
      <TelemetryGauge
        value={90}
        min={0}
        max={100}
        label="SoC"
        unit="%"
        variant="circular"
        theme="warning"
      />,
    );
    expect(fillArcStroke(container)).toBe(GAUGE_THEMES.warning.dark);
  });

  it("linear: varsayılan bar rengi tema mid tonudur", () => {
    const { container } = render(
      <TelemetryGauge
        value={50}
        min={0}
        max={100}
        label="Sıcaklık"
        unit="°C"
        variant="linear"
        theme="temp"
      />,
    );
    const bar = barFillElement(container);
    expect(bar).toBeTruthy();
    expect((bar as HTMLElement).style.background).toBe(
      hexToRgb(GAUGE_THEMES.temp.mid),
    );
  });

  it("linear: açık color prop'u temayı ezer", () => {
    const { container } = render(
      <TelemetryGauge
        value={50}
        min={0}
        max={100}
        label="Voltaj"
        unit="V"
        variant="linear"
        theme="success"
        color="#123456"
      />,
    );
    const bar = barFillElement(container);
    expect((bar as HTMLElement).style.background).toBe(hexToRgb("#123456"));
  });
});
