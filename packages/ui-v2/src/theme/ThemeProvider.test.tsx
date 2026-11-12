import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useEmsTheme } from "./ThemeProvider";
import type { ThemeMode } from "./ThemeProvider";

const Probe = () => {
  const theme = useEmsTheme();
  return <span data-testid="probe">{theme.mode}:{theme.colors.surface}</span>;
};

const renderWith = (mode: ThemeMode) =>
  render(
    <ThemeProvider mode={mode}>
      <Probe />
    </ThemeProvider>,
  );

describe("ThemeProvider", () => {
  it("varsayılan light temayı ve açık token'ları sunar", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("light:#FFFFFF");
  });

  it("dark modunda koyu token'ları sunar", () => {
    renderWith("dark");
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:#141B27");
  });

  it("CSS değişkenlerini :root üzerinde yayınlar", () => {
    renderWith("dark");
    const style = Array.from(document.querySelectorAll("style"))
      .map((el) => el.textContent ?? "")
      .join("\n");
    expect(style).toContain("--ems-surface:#141B27");
    expect(style).toContain("--ems-bg-page:#0B0F17");
  });

  it("mod değişince render güncellenir", () => {
    const { rerender } = renderWith("light");
    expect(screen.getByTestId("probe")).toHaveTextContent("light:#FFFFFF");
    rerender(
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:#141B27");
  });
});
