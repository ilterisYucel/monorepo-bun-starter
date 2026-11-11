import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDemoTheme } from "./demo-theme";

const KEY = "gdpms.theme";

describe("useDemoTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("localStorage dark → mount anında (senkron) data-theme dark uygular", () => {
    localStorage.setItem(KEY, "dark");
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current[0]).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setTheme('light') → değişkenleri ve localStorage'ı günceller", () => {
    localStorage.setItem(KEY, "dark");
    const { result } = renderHook(() => useDemoTheme());
    act(() => result.current[1]("light"));
    expect(result.current[0]).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(KEY)).toBe("light");
  });
});
