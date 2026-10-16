import { describe, it, expect } from "vitest";
import { applyNovaVars, novaVarMap } from "./apply-nova-vars";

describe("apply-nova-vars (K-2)", () => {
  it("light haritası light token değerlerini taşır", () => {
    const map = novaVarMap("light");
    expect(map["--nm-fg"]).toBe("#18212a");
    expect(map["--nm-bg"]).toBe("#e4e8eb");
    expect(map["--nm-panel"]).toBe("#f3f5f6");
  });

  it("dark haritası referans dark değerlerini taşır (AK-1.2)", () => {
    const map = novaVarMap("dark");
    expect(map["--nm-fg"]).toBe("#dbe2e8");
    expect(map["--nm-panel"]).toBe("#151a1f");
    expect(map["--nm-flow-dis"]).toBe("#f2a24a");
    expect(map["--nm-hot-rgb"]).toBe("255,92,64");
  });

  it("dark tema bir elemana uygulanır", () => {
    const el = document.createElement("div");
    applyNovaVars("dark", el);
    expect(el.style.getPropertyValue("--nm-fg")).toBe("#dbe2e8");
  });
});
