import { describe, it, expect } from "vitest";
import { DeviceCatalog } from "./device-catalog";
import type { DeviceCatalogEntry } from "./device-catalog";

/**
 * DeviceCatalog sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §5, T6):
 *
 * - Girdi: (deviceId, type?) girdileri — RuleConfigLoader device config
 *   dizinini tarayarak üretir.
 * - `resolveTargets(selector?)`: sorgu — seçici yoksa TÜM cihazlar;
 *   `ids` + `types` çözümü BİRLEŞİM (OR) ve çift kayıt olmadan döner.
 * - `types` eşleşmesi config `type` alanına birebir string eşitliktir.
 * - Yan etki: YOK. Limitler: selector boş dizileri şema katmanında reddedilir;
 *   burada savunmacı olarak boş dizi → boş sonuç.
 */

const entries: DeviceCatalogEntry[] = [
  { deviceId: "bsc-1", type: "bsc" },
  { deviceId: "bsc-2", type: "bsc" },
  { deviceId: "cb-1", type: "cb" },
  { deviceId: "legacy-1" },
];

function catalog(): DeviceCatalog {
  return new DeviceCatalog(entries);
}

describe("DeviceCatalog", () => {
  it("seçici yoksa tüm cihazlar", () => {
    expect(catalog().resolveTargets(undefined)).toEqual([
      "bsc-1",
      "bsc-2",
      "cb-1",
      "legacy-1",
    ]);
  });

  it("ids seçicisi birebir döner", () => {
    expect(catalog().resolveTargets({ ids: ["bsc-1", "cb-1"] })).toEqual([
      "bsc-1",
      "cb-1",
    ]);
  });

  it("types seçicisi eşleşen cihazları döner", () => {
    expect(catalog().resolveTargets({ types: ["bsc"] })).toEqual([
      "bsc-1",
      "bsc-2",
    ]);
  });

  it("ids + types birleşim (çift kayıt yok)", () => {
    const targets = catalog().resolveTargets({ ids: ["bsc-2"], types: ["bsc"] });
    expect(targets).toHaveLength(2);
    expect(targets).toContain("bsc-1");
    expect(targets).toContain("bsc-2");
  });

  it("bilinmeyen type → yalnızca ids varsa onlar", () => {
    expect(catalog().resolveTargets({ types: ["unknown"] })).toEqual([]);
    expect(
      catalog().resolveTargets({ ids: ["cb-1"], types: ["unknown"] }),
    ).toEqual(["cb-1"]);
  });

  it("type olmayan cihaz yalnızca ids ile seçilir", () => {
    expect(catalog().resolveTargets({ types: ["bsc"] })).not.toContain(
      "legacy-1",
    );
    expect(catalog().resolveTargets({ ids: ["legacy-1"] })).toEqual([
      "legacy-1",
    ]);
  });

  it("bilinmeyen id sessizce yok sayılır", () => {
    expect(catalog().resolveTargets({ ids: ["yok-1"] })).toEqual([]);
  });
});
