import { describe, it, expect } from "vitest";
import { DEMO_PORTFOLIO, findPortfolioProject } from "./demo-portfolio";
import { DEMO_TOPOLOGY } from "./demo-topology";

/**
 * UC-11 (FR-11.2/FR-11.3) — portföy künyesi sözleşmesi:
 * iki proje, tam olarak biri canlı ve canlı projenin kimliği DEMO_TOPOLOGY
 * ile birebir; statik proje Antalya/GDE-202050 (demo, canlı API yok).
 */
describe("demo-portfolio (UC-11)", () => {
  it("AK-11.2: iki proje tanımlıdır", () => {
    expect(DEMO_PORTFOLIO).toHaveLength(2);
  });

  it("AK-11.3: tam olarak bir proje canlıdır", () => {
    expect(DEMO_PORTFOLIO.filter((p) => p.live)).toHaveLength(1);
  });

  it("canlı proje kimliği DEMO_TOPOLOGY ile hizalıdır", () => {
    const live = DEMO_PORTFOLIO.find((p) => p.live)!;
    expect(live.id).toBe(DEMO_TOPOLOGY.id);
    expect(live.name).toBe(DEMO_TOPOLOGY.name);
    expect(live.location).toBe(DEMO_TOPOLOGY.location);
    expect(live.connMW).toBe(DEMO_TOPOLOGY.powerMW);
  });

  it("proje id'leri benzersizdir", () => {
    const ids = DEMO_PORTFOLIO.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("statik proje canlı değildir ve solar kaynak taşır", () => {
    const statik = DEMO_PORTFOLIO.find((p) => !p.live)!;
    expect(statik.id).toBe("GDE-202050");
    expect(statik.location).toContain("Antalya");
    expect(statik.source).toBe("solar");
  });

  it("findPortfolioProject id ile bulur, yoksa undefined", () => {
    expect(findPortfolioProject(DEMO_TOPOLOGY.id)?.live).toBe(true);
    expect(findPortfolioProject("YOK")).toBeUndefined();
  });
});
