import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleConfigLoader } from "./rule-config-loader";

/**
 * RuleConfigLoader sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §5-§8, T6):
 *
 * - `loadRules()`: sorgu — rules.json'ı okur + `automationRulesSchema` ile
 *   doğrular; dosya yok / bozuk JSON / şema reddi → ValidationError THROW
 *   (fail-fast açılış reddi). Bilinmeyen anahtar şema katmanında reddedilir.
 * - `loadCatalog()`: sorgu — device config dizinindeki *.json dosyalarından
 *   (deviceId, type) girdileri üretir; bozuk dosyalar atlanır (best-effort),
 *   dizin boşsa boş katalog.
 * - Yan etki: YOK (yalnızca dosya okuma).
 */

const validRules = {
  rules: [
    {
      name: "high-soc-stop",
      cooldownMs: 300000,
      when: {
        all: [
          { device: { types: ["bsc"] }, telemetry: "soc", op: "gte", threshold: 95 },
        ],
      },
      then: [{ action: "notify" }],
    },
  ],
};

function tmpDirs(): { root: string; rulesPath: string; configDir: string } {
  const root = mkdtempSync(join(tmpdir(), "mgmt-cfg-XXXXXX"));
  return {
    root,
    rulesPath: join(root, "rules.json"),
    configDir: join(root, "devices"),
  };
}

describe("RuleConfigLoader.loadRules", () => {
  it("geçerli dosyayı yükler (tipli)", () => {
    const { rulesPath, configDir } = tmpDirs();
    writeFileSync(rulesPath, JSON.stringify(validRules));
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    const loaded = loader.loadRules();
    expect(loaded.rules).toHaveLength(1);
    expect(loaded.rules[0]!.name).toBe("high-soc-stop");
  });

  it("dosya yok → throw", () => {
    const { rulesPath, configDir } = tmpDirs();
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    expect(() => loader.loadRules()).toThrow();
  });

  it("bozuk JSON → throw", () => {
    const { rulesPath, configDir } = tmpDirs();
    writeFileSync(rulesPath, "{ bozuk");
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    expect(() => loader.loadRules()).toThrow();
  });

  it("şema reddi (then boş) → throw", () => {
    const { rulesPath, configDir } = tmpDirs();
    writeFileSync(
      rulesPath,
      JSON.stringify({
        rules: [
          {
            name: "x",
            when: { all: [{ telemetry: "soc", op: "gt", threshold: 1 }] },
            then: [],
          },
        ],
      }),
    );
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    expect(() => loader.loadRules()).toThrow();
  });

  it("bilinmeyen anahtar → throw (strict şema)", () => {
    const { rulesPath, configDir } = tmpDirs();
    writeFileSync(rulesPath, JSON.stringify({ rules: validRules.rules, version: 2 }));
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    expect(() => loader.loadRules()).toThrow();
  });
});

describe("RuleConfigLoader.loadCatalog", () => {
  it("dizindeki cihaz config'lerinden katalog üretir", () => {
    const { rulesPath, configDir } = tmpDirs();
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, "bsc-1.json"),
      JSON.stringify({ deviceId: "bsc-1", type: "bsc" }),
    );
    writeFileSync(
      join(configDir, "cb-1.json"),
      JSON.stringify({ deviceId: "cb-1", type: "cb" }),
    );
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    const catalog = loader.loadCatalog();
    expect(catalog.resolveTargets(undefined)).toEqual(["bsc-1", "cb-1"]);
    expect(catalog.resolveTargets({ types: ["bsc"] })).toEqual(["bsc-1"]);
  });

  it("bozuk cihaz dosyası atlanır (best-effort)", () => {
    const { rulesPath, configDir } = tmpDirs();
    mkdirSync(configDir);
    writeFileSync(join(configDir, "bad.json"), "{ bozuk");
    writeFileSync(
      join(configDir, "ok-1.json"),
      JSON.stringify({ deviceId: "ok-1", type: "hvac" }),
    );
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    const catalog = loader.loadCatalog();
    expect(catalog.resolveTargets(undefined)).toEqual(["ok-1"]);
  });

  it("dizin yoksa boş katalog", () => {
    const { rulesPath, configDir } = tmpDirs();
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    expect(loader.loadCatalog().resolveTargets(undefined)).toEqual([]);
  });

  it("type alanı olmayan cihaz da kataloga girer (type undefined)", () => {
    const { rulesPath, configDir } = tmpDirs();
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, "legacy-1.json"),
      JSON.stringify({ deviceId: "legacy-1" }),
    );
    const loader = new RuleConfigLoader({ rulesPath, deviceConfigDir: configDir });
    const catalog = loader.loadCatalog();
    expect(catalog.resolveTargets(undefined)).toEqual(["legacy-1"]);
    expect(catalog.resolveTargets({ ids: ["legacy-1"] })).toEqual(["legacy-1"]);
  });
});
