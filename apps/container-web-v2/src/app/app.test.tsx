import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@gd-monorepo/ui-v2";
import { ThemeModeProvider, useThemeMode } from "../theme/ThemeModeProvider";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage";
import { InfoPage } from "../pages/InfoPage/InfoPage";
import { DrawerFullPage } from "../pages/DrawerFullPage/DrawerFullPage";

const wrap = (node: React.ReactNode) =>
  render(
    <ThemeModeProvider>
      <ThemeProvider mode="light">{node}</ThemeProvider>
    </ThemeModeProvider>,
  );

const ModeProbe = () => {
  const { mode, toggle } = useThemeMode();
  return (
    <button type="button" onClick={toggle}>
      mode:{mode}
    </button>
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("tema modu", () => {
  it("varsayılan light, toggle dark'a geçer ve kalıcı olur", () => {
    wrap(<ModeProbe />);
    const button = screen.getByRole("button", { name: "mode:light" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "mode:dark" })).toBeInTheDocument();
    expect(window.localStorage.getItem("ems-theme-v2")).toBe("dark");
  });

  it("localStorage'daki dark modunu okur", () => {
    window.localStorage.setItem("ems-theme-v2", "dark");
    wrap(<ModeProbe />);
    expect(screen.getByRole("button", { name: "mode:dark" })).toBeInTheDocument();
  });
});

describe("DashboardPage", () => {
  it("KPI, tek-hat, plan, olay ve durum bölümlerini render eder", () => {
    wrap(<DashboardPage />);
    expect(screen.getByText("GD-1 · MV Station #1")).toBeInTheDocument();
    expect(screen.getByText("Active power · AC")).toBeInTheDocument();
    expect(screen.getAllByText("BSC#1").length).toBeGreaterThan(0);
    expect(screen.getByText("Container plan")).toBeInTheDocument();
    expect(screen.getByText("Events and system log")).toBeInTheDocument();
    expect(screen.getByText("BSC#1 state")).toBeInTheDocument();
    expect(screen.getByText("Air temperature 27,1 °C is above the 26,0 °C limit")).toBeInTheDocument();
  });

  it("rack'e tıklayınca drawer açılır, kapatma çalışır", () => {
    wrap(<DashboardPage />);
    const rack = screen.getByText("Rack#1").closest('[role="button"]');
    expect(rack).toBeTruthy();
    if (rack) fireEvent.click(rack);
    expect(screen.getByRole("heading", { name: "BESS#3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Drawer'ı kapat" }));
    expect(screen.queryByRole("heading", { name: "BESS#3" })).not.toBeInTheDocument();
  });
});

describe("InfoPage", () => {
  it("legend popover'ını gösterir", () => {
    wrap(<InfoPage />);
    expect(screen.getByRole("dialog", { name: "Legend" })).toBeInTheDocument();
    expect(screen.getByText("Container state")).toBeInTheDocument();
    expect(screen.getByText("Breaker closed")).toBeInTheDocument();
  });
});

describe("DrawerFullPage", () => {
  it("tam drawer içeriğini render eder", () => {
    wrap(<DrawerFullPage />);
    expect(screen.getByRole("heading", { name: "BESS#3" })).toBeInTheDocument();
    expect(screen.getByText("Selected pack P16")).toBeInTheDocument();
    expect(screen.getByText("Battery sections")).toBeInTheDocument();
  });
});
