import { describe, it, expect } from "vitest";
import { apiBaseUrl, isTunnelMode, fieldRootPath } from "./api-base";

/**
 * Boss Faz 3 — field app URL türetimi sözleşmesi:
 * - Normal saha modu: "/api".
 * - Tünel modu: "/fields/<fid>/ui/*" → api "/fields/<fid>/ui/api".
 * - Tünel tespiti yalnızca /fields/<fid>/ui önekiyle (alt rota yanlış pozitifi yok).
 */

describe("field api-base (Boss Faz 3)", () => {
  it("kök dizinde /api döner", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "localhost:5174", pathname: "/" }),
    ).toBe("/api");
  });

  it("normal saha rotalarında /api döner (tünel değil)", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "localhost:5174", pathname: "/field/f-1" }),
    ).toBe("/api");
    expect(
      apiBaseUrl({ protocol: "http:", host: "localhost:5174", pathname: "/login" }),
    ).toBe("/api");
  });

  it("tünel subpath'inde /fields/:fid/ui/api döner", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "boss.local", pathname: "/fields/f-1/ui/" }),
    ).toBe("/fields/f-1/ui/api");
  });

  it("trailing slash normalize edilir", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "x", pathname: "/fields/f-1/ui///" }),
    ).toBe("/fields/f-1/ui/api");
  });

  it("tünel içindeki alt route'lar prefix'i korur", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "x", pathname: "/fields/f-1/ui/dashboard" }),
    ).toBe("/fields/f-1/ui/api");
  });

  it("isTunnelMode yalnızca /fields/:fid/ui önekinde true", () => {
    expect(isTunnelMode({ protocol: "http:", host: "x", pathname: "/fields/f-1/ui/" })).toBe(true);
    expect(isTunnelMode({ protocol: "http:", host: "x", pathname: "/fields/f-1/ui/dashboard" })).toBe(true);
    expect(isTunnelMode({ protocol: "http:", host: "x", pathname: "/fields/f-1" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "x", pathname: "/login" })).toBe(false);
    expect(isTunnelMode({ protocol: "", host: "", pathname: "/fields/f-1/ui/" })).toBe(false);
  });

  it("fieldRootPath — normal modda /field/:fid, tünelde /fields/:fid/ui", () => {
    expect(
      fieldRootPath("f-1", { protocol: "http:", host: "x", pathname: "/field/f-1" }),
    ).toBe("/field/f-1");
    expect(
      fieldRootPath("f-1", { protocol: "http:", host: "x", pathname: "/fields/f-1/ui/" }),
    ).toBe("/fields/f-1/ui");
    expect(
      fieldRootPath("f-1", { protocol: "http:", host: "x", pathname: "/fields/f-1/ui/containers" }),
    ).toBe("/fields/f-1/ui");
  });
});
