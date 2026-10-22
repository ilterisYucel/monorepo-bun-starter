import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegisterBar, RegModeProvider, RegisterValue, RegModeSegment, useRegMode } from "./DemoRegMode";
import { bscSource } from "./register-sources";

/**
 * UC-12 register-source modu — SPEC AK-12.1/12.2/12.6.
 */

const Toggle: React.FC = () => {
  const { mode, setMode } = useRegMode();
  return (
    <button type="button" onClick={() => setMode(mode === "val" ? "tip" : "val")}>
      toggle
    </button>
  );
};

const source = bscSource("BSC-1", "bank.soc", { bank: "A" });

beforeEach(() => {
  localStorage.clear();
  document.body.className = "";
});

describe("DemoRegMode", () => {
  it("AK-12.2: val modunda düz metin (sarma yok)", () => {
    render(
      <RegModeProvider>
        <RegisterValue source={source}>55 %</RegisterValue>
      </RegModeProvider>,
    );
    expect(screen.getByText("55 %").closest(".rv")).toBeNull();
  });

  it("AK-12.2: tip modunda .rv + data-rsk ve inline çip üretir", () => {
    const { container } = render(
      <RegModeProvider>
        <RegisterValue source={source}>55 %</RegisterValue>
        <RegisterBar />
        <Toggle />
      </RegModeProvider>,
    );
    fireEvent.click(screen.getByText("toggle"));
    const rv = container.querySelector(".rv");
    expect(rv).not.toBeNull();
    expect(rv?.getAttribute("data-rsk")).toBeTruthy();
    expect(rv?.querySelector(".rvs")?.textContent).toContain("30055");
    expect(container.querySelector(".regbar")).not.toBeNull();
  });

  it("AK-12.1: segment modu değiştirir ve localStorage'a yazar", () => {
    render(
      <RegModeProvider>
        <RegModeSegment />
      </RegModeProvider>,
    );
    fireEvent.click(screen.getByText("Inline"));
    expect(localStorage.getItem("gdpm.demo.regmode")).toBe("inline");
    expect(document.body.classList.contains("reginline")).toBe(true);
  });

  it("AK-12.1: localStorage'dan mod geri yüklenir", () => {
    localStorage.setItem("gdpm.demo.regmode", "inline");
    render(
      <RegModeProvider>
        <RegModeSegment />
        <RegisterBar />
      </RegModeProvider>,
    );
    expect(screen.getByText("Inline").getAttribute("aria-pressed")).toBe("true");
  });
});
