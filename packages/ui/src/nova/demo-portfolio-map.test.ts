import { describe, it, expect } from "vitest";
import { GEO, project } from "./geo-europe";
import {
  MAP_HOME,
  homeViewBox,
  clampViewBox,
  zoomViewBox,
  fitViewBox,
} from "./demo-portfolio-map";

/**
 * UC-11 (FR-11.2/FR-11.8) — saf harita matematiği:
 * Mercator projeksiyon, görünüm (viewBox) kırpma/zoom/sığdırma. IO yok.
 */
describe("geo-europe (UC-11, K16)", () => {
  it("projeksiyon lon artışında x'i büyütür, lat artışında y'yi küçültür", () => {
    const [x1] = project(10, 40);
    const [x2] = project(20, 40);
    expect(x2).toBeGreaterThan(x1);
    const [, y1] = project(20, 40);
    const [, y2] = project(20, 50);
    expect(y2).toBeLessThan(y1);
  });

  it("GEO ülke listesi + tuval boyutu taşır", () => {
    expect(GEO.W).toBe(1600);
    expect(GEO.H).toBe(1286);
    expect(GEO.countries.length).toBeGreaterThan(10);
    expect(GEO.countries.some((c) => c.id === "792")).toBe(true); // Türkiye
  });
});

describe("demo-portfolio-map (UC-11)", () => {
  it("MAP_HOME Türkiye'yi kapsar", () => {
    expect(MAP_HOME.lon0).toBeLessThan(33);
    expect(MAP_HOME.lon1).toBeGreaterThan(36);
  });

  it("homeViewBox projeksiyon köşelerinden türetilir (x<y hizası)", () => {
    const vb = homeViewBox();
    const [x0] = project(MAP_HOME.lon0, MAP_HOME.lat0);
    const [x1] = project(MAP_HOME.lon1, MAP_HOME.lat1);
    expect(vb.x).toBeCloseTo(x0, 6);
    expect(vb.w).toBeCloseTo(x1 - x0, 6);
    expect(vb.w).toBeGreaterThan(0);
    expect(vb.h).toBeGreaterThan(0);
  });

  it("clampViewBox aspect'i ayarlar ve harita sınırında kırpar", () => {
    const off = clampViewBox({ x: -500, y: -500, w: 100000, h: 100000 }, 1);
    expect(off.x).toBeGreaterThanOrEqual(0);
    expect(off.y).toBeGreaterThanOrEqual(0);
    expect(off.w).toBeLessThanOrEqual(GEO.W + 1e-6);
    expect(off.h).toBeLessThanOrEqual(GEO.H + 1e-6);
    const asp = clampViewBox({ x: 100, y: 100, w: 400, h: 1 }, 2);
    expect(asp.h).toBeCloseTo(asp.w / 2, 6);
  });

  it("zoomViewBox yakınlaştırınca w küçülür, uzaklaştırınca büyür", () => {
    const home = homeViewBox();
    const zin = zoomViewBox(home, 2, { x: home.x + home.w / 2, y: home.y + home.h / 2 });
    expect(zin.w).toBeLessThan(home.w);
    const zout = zoomViewBox(home, 0.5, { x: home.x, y: home.y });
    expect(zout.w).toBeGreaterThan(home.w);
  });

  it("zoomViewBox ZMAX sınırını aşmaz", () => {
    const home = homeViewBox();
    let vb = home;
    for (let i = 0; i < 40; i++) {
      vb = zoomViewBox(vb, 4, { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }, 14);
    }
    expect(vb.w).toBeGreaterThanOrEqual(home.w / 14 - 1e-6);
  });

  it("fitViewBox tüm noktaları kapsar", () => {
    const home = homeViewBox();
    const pts: [number, number][] = [
      project(32.15, 39.58),
      project(30.6, 37.03),
    ];
    const vb = fitViewBox(pts, home);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(vb.x);
      expect(x).toBeLessThanOrEqual(vb.x + vb.w);
      expect(y).toBeGreaterThanOrEqual(vb.y);
      expect(y).toBeLessThanOrEqual(vb.y + vb.h);
    }
  });
});
