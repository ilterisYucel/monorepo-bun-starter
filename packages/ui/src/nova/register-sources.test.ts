import { describe, it, expect } from "vitest";
import {
  bscSource,
  calcSource,
  mappingFor,
  modelSource,
  nomapSource,
  pcsSource,
  rackSource,
  resolveRegister,
  sourceByKey,
  sourceKey,
  sourceText,
  tipHtml,
} from "./register-sources";
import { rackAddr } from "./demo-registers";

/**
 * UC-12 register-source katmanı — SPEC AK-12.2..12.4.
 * Saf fonksiyonlar; IO yok. Değer → kaynak ve hover kartı içeriği sabitlenir.
 */
describe("register-sources", () => {
  it("mapping anahtarı ile register id'yi çözer (bank.soc → bsc.soc)", () => {
    const found = resolveRegister("bank.soc");
    expect(found?.reg.id).toBe("bsc.soc");
    expect(found?.map?.key).toBe("bank.soc");
    expect(mappingFor("pcs.state")?.register).toBe("pcs.opStatus");
  });

  it("AK-12.2: BSC kaynağı device/adres/FC/screen mapping taşır", () => {
    const s = bscSource("BSC-1", "bsc.soc", { bank: "A", group: 3 });
    expect(s.kind).toBe("reg");
    expect(s.dev).toBe("BSC-1");
    expect(s.fam).toBe("BSC");
    expect(s.addr).toBe(30055);
    expect(s.fc).toBe(4);
    expect(s.ip).toBe("10.10.1.11");
    expect(s.map?.key).toBe("bank.soc");
    expect(s.group).toBe(3);
    const html = tipHtml(s, "55 %");
    expect(html).toContain("Modbus register");
    expect(html).toContain("30055");
    expect(html).toContain("FC 04");
    expect(html).toContain("Bank SOC");
    expect(html).toContain("raw");
  });

  it("PCS kaynağı holding register + Wattox modeli", () => {
    const s = pcsSource("PCS-2", "pcs.p", { bank: "B" });
    expect(s.fam).toBe("PCS");
    expect(s.fc).toBe(3);
    expect(s.model).toContain("Wattox");
    expect(s.ip).toBe("10.10.1.22");
  });

  it("rack kaynağı 30170 + 150·(pos−1) + offset adresini üretir", () => {
    const s = rackSource("BSC-1", 3, "rack.tMax");
    expect(s.addr).toBe(rackAddr(3, 89));
    expect(s.rack).toEqual({ no: 3, pos: 3, base: rackAddr(3, 0), offset: 89 });
    expect(s.fc).toBe(4);
    expect(s.prio).toBe("rack");
    expect(tipHtml(s, "24,0")).toContain("Rack block");
  });

  it("AK-12.3: calc kaynağı girdi register listesini gösterir", () => {
    const s = calcSource("average of BSC SOC", [bscSource("BSC-1", "bsc.soc", { bank: "A" })]);
    const html = tipHtml(s, "55 %");
    expect(html).toContain("PMS calculation");
    expect(html).toContain("Computed by");
    expect(html).toContain("BSC-1");
    expect(html).toContain("30055");
  });

  it("AK-12.4: nomap/model işaretleri", () => {
    const nm = tipHtml(nomapSource("DEMO-MV-1", "POI active power"), "1,20 MW");
    expect(nm).toContain("Register map not supplied");
    expect(nm).toContain("M1–M7");
    const md = tipHtml(modelSource("project configuration"), "30 MWe");
    expect(md).toContain("Simulation / configuration");
  });

  it("bilinmeyen register id → nomap'e düşer", () => {
    const s = bscSource("BSC-1", "bsc.doesNotExist");
    expect(s.kind).toBe("nomap");
  });

  it("sourceKey kararlıdır ve sourceByKey roundtrip yapar", () => {
    const a = bscSource("BSC-1", "bsc.soc", { bank: "A" });
    const b = bscSource("BSC-1", "bsc.soc", { bank: "A" });
    const ka = sourceKey(a);
    const kb = sourceKey(b);
    expect(ka).toBe(kb);
    expect(sourceByKey(ka)?.name).toBe(a.name);
  });

  it("sourceText tek satır özet üretir", () => {
    const s = bscSource("BSC-1", "bsc.soc", { bank: "A" });
    expect(sourceText(s)).toContain("BSC-1");
    expect(sourceText(s)).toContain("FC4");
    expect(sourceText(undefined)).toBe("");
  });
});
