import { describe, it, expect } from "vitest";
import { mimicSourceForId, DEFAULT_MIMIC_DEVICES } from "./mimic-source-map";
import { tipHtml } from "./register-sources";

/**
 * UC-12 FR-12.5 — mimik SVG id → kaynak eşlemesi (referans `srcForId` portu).
 */
describe("mimic-source-map", () => {
  it("bank t1 → SOC·SOH calc, doğru fiziksel cihaz + grup", () => {
    const s = mimicSourceForId("nm1_3Bt1");
    expect(s?.kind).toBe("calc");
    expect(s?.group).toBe(3);
    expect(s?.parts?.map((p) => p.dev)).toEqual(["BSC-2", "BSC-2"]);
    expect(s?.parts?.map((p) => p.name)).toEqual(["BSC SOC (online racks)", "BSC SOH (online racks)"]);
  });

  it("bank t2 → DC voltage · max pack temperature", () => {
    const s = mimicSourceForId("nm1_5At2");
    expect(s?.parts?.map((p) => p.name)).toEqual(["BSC DC Voltage (online racks)", "Max Pack Temperature"]);
  });

  it("pcs ps/pp/pt → PCS register'ları", () => {
    expect(mimicSourceForId("nm1_7Aps")?.kind).toBe("reg");
    expect(mimicSourceForId("nm1_7Aps")?.dev).toBe("PCS-1");
    expect(mimicSourceForId("nm1_7Bpp")?.dev).toBe("PCS-2");
    expect(mimicSourceForId("nm1_7Bpt")?.name).toContain("IGBT temperature");
  });

  it("rack → 30170 tabanlı rack register", () => {
    const s = mimicSourceForId("nm1_9Br3");
    expect(s?.kind).toBe("reg");
    expect(s?.rack?.no).toBe(4);
    expect(s?.dev).toBe("BSC-2");
  });

  it("ust → grup durumu calc", () => {
    const s = mimicSourceForId("nm1_ust2");
    expect(s?.group).toBe(2);
    expect(s?.parts?.length).toBe(2);
  });

  it("POI/AUX/feeder/meter → nomap saha cihazları", () => {
    expect(mimicSourceForId("nm1_poiTxt")?.kind).toBe("nomap");
    expect(mimicSourceForId("nm1_poiTxt")?.dev).toBe("DEMO-MV-1");
    expect(mimicSourceForId("nm1_auxTxt")?.dev).toBe("PM5340-1");
    expect(mimicSourceForId("nm1_fdAtxt")?.kind).toBe("nomap");
    expect(mimicSourceForId("nm1_H04I")?.name).toContain("phase current");
    expect(mimicSourceForId("nm1_vtTxt")?.dev).toBe("DEMO-MV-1");
  });

  it("bilinmeyen id → null", () => {
    expect(mimicSourceForId("nm1_unknown")).toBeNull();
    expect(mimicSourceForId("nm1_foo123")).toBeNull();
  });

  it("tipHtml ile mimik kaynağı kart üretir", () => {
    const s = mimicSourceForId("nm1_1At1");
    expect(tipHtml(s, "55 %")).toContain("PMS calculation");
  });

  it("özel cihaz haritası kullanılabilir", () => {
    const s = mimicSourceForId("nm1_1Aps", {
      ...DEFAULT_MIMIC_DEVICES,
      pcs: () => "PCS-X",
    });
    expect(s?.dev).toBe("PCS-X");
  });
});
