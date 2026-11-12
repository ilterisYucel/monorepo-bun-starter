import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "./theme";
import { Badge } from "./components/primitives/Badge";
import { Card } from "./components/primitives/Card";
import { StatusPill } from "./components/primitives/StatusPill";
import { KpiRow } from "./components/dashboard/KpiRow";
import { ContainerPlan } from "./components/dashboard/ContainerPlan";
import { Sidebar } from "./components/dashboard/Sidebar";
import { ContainerDrawer } from "./components/drawer/ContainerDrawer";
import { COMPACT, TYPE } from "./typography";
import { RADIUS, ELEVATION, SPACING } from "./system";

const css = () =>
  Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");

const wrap = (node: React.ReactNode) =>
  render(<ThemeProvider mode="light">{node}</ThemeProvider>);

describe("tasarım parity — token değerleri", () => {
  it("radius/spacing/elevation ölçekleri design guide ile aynı", () => {
    expect(RADIUS).toEqual({ sm: 6, md: 8, lg: 12, xl: 16, pill: 999 });
    expect(SPACING).toEqual({ xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
    expect(ELEVATION.card).toBe("0 6px 18px rgba(15, 26, 51, 0.07)");
  });

  it("tipografi COMPACT ekran değerleri 1.2× line-height", () => {
    expect(COMPACT.label.lineHeight).toBeCloseTo(14.4, 5);
    expect(COMPACT.kpiM.lineHeight).toBeCloseTo(26.4, 5);
    expect(TYPE.badge.letterSpacing).toBe(0.4);
  });
});

describe("tasarım parity — bileşen ölçüleri", () => {
  it("StatusPill H28 / pad 0 12 / radius pill / small shadow", () => {
    wrap(<StatusPill tone="success">Ready</StatusPill>);
    const styles = css();
    expect(styles).toContain("height:28px");
    expect(styles).toContain("padding:0 12px");
    expect(styles).toContain("border-radius:999px");
    expect(styles).toContain(ELEVATION.small);
  });

  it("Badge H20 / pad 0 8 / 10 SemiBold / +0.4 tracking", () => {
    wrap(<Badge tone="critical">ALARM</Badge>);
    const styles = css();
    expect(styles).toContain("height:20px");
    expect(styles).toContain("padding:0 8px");
    expect(styles).toContain("font-size:10px");
    expect(styles).toContain("letter-spacing:0.4px");
  });

  it("top-level Card r16 + card shadow", () => {
    wrap(<Card>x</Card>);
    const styles = css();
    expect(styles).toContain("border-radius:16px");
    expect(styles).toContain(ELEVATION.card);
  });

  it("KPI kartı H119 / pad 12 14 / değer 22/26.4", () => {
    wrap(<KpiRow items={[{ key: "a", label: "Active power · AC", value: "+2,15", unit: "MW" }]} />);
    const styles = css();
    expect(styles).toContain("height:119px");
    expect(styles).toContain("padding:12px 14px");
    expect(styles).toContain("font-size:22px");
    expect(styles).toContain("line-height:26.4px");
  });

  it("ContainerPlan oda sıcaklığı 26/31.2", () => {
    wrap(
      <ContainerPlan
        panel={{ temperature: 24, subtitle: "Panel", scalePct: 50, footerLeft: "a", footerRight: "b" }}
        rooms={[{ key: "r", label: "Room 1", range: "R1", temperature: 21.4, dots: [], scalePct: 40, supply: 18, ret: 26, humidity: 41, chips: [] }]}
      />,
    );
    const styles = css();
    expect(styles).toContain("font-size:26px");
    expect(styles).toContain("line-height:31.2px");
  });

  it("Sidebar 130 px, drawer 480 px", () => {
    wrap(
      <>
        <Sidebar active="dashboard" items={[{ key: "dashboard", label: "Dashboard", icon: "dashboard" }]} />
        <ContainerDrawer
          title="BESS#3"
          stateBadge={{ tone: "success", label: "Ready" }}
          feeder="feeder"
          rack={{ id: "Rack#4", soc: 72, soh: 97, temperature: 23, voltage: 1328, current: 1092, cellTempMax: 23, cellTempMin: 21, cellVoltageMax: 3251, cellVoltageMin: 3213 }}
          pack={{ id: "P16", cells: [], hardware: [] }}
          rmu={[]}
          pcs={[]}
          banks={[]}
        />
      </>,
    );
    const styles = css();
    expect(styles).toContain("width:130px");
    expect(styles).toContain("width:480px");
  });
});
