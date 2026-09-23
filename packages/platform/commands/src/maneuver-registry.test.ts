import { describe, it, expect, vi } from "vitest";
import type {
  ManeuverRecord,
  OperationRecord,
} from "@gd-monorepo/shared-types";
import { ManeuverRegistry } from "./maneuver-registry";
import type { IOperationDefSource, OperationDefinition } from "./maneuver-registry";

/**
 * ManeuverRegistry sözleşmesi (KOMUT-MANEVRA-OPERASYON-MIMARISI.md §4, §11.1):
 *
 * - Davranışsız kayıt — yalnızca isimle çözer (`resolve` sorgu); yürütme
 *   YOKTUR (mode/onFailure/rollback yürütücünün girdisidir).
 * - Kayıtlar kurulurken zaten fail-fast doğrulanmıştır (loadManeuversFile /
 *   loadOperationsFile); registry AYNI isimde iki DOSYA kaydında da fail-fast
 *   fırlatır (DB'de (kind, name) PK — §11.1).
 * - HİBRİT (§11.1): `resolve` DB > dosya sırasıyla çözer; disabled DB kaydı →
 *   err({kind:"disabled"}); `list` enabled DB kayıtları + gölgelenmeyen dosya
 *   kayıtlarını döner.
 * - Bilinmeyen isim → err({kind:"not_found"}) — throw YOK.
 * - Yan etki YOK (kaynak sorguları dışında).
 */

function maneuver(name: string): ManeuverRecord {
  return {
    name,
    label: name.toUpperCase(),
    mode: "parallel",
    steps: [{ deviceId: "BSC-1", command: "stop" }],
  };
}

function operation(name: string): OperationRecord {
  return {
    name,
    label: name.toUpperCase(),
    mode: "sequential",
    steps: [{ maneuver: "pcs_charge", params: { powerKw: 200 } }],
  };
}

function dbDef(
  kind: "maneuver" | "operation",
  name: string,
  overrides: Partial<OperationDefinition> = {},
): OperationDefinition {
  return {
    name,
    kind,
    definition: kind === "maneuver" ? maneuver(name) : operation(name),
    enabled: true,
    updatedBy: "admin",
    updatedAt: "2026-09-22T10:00:00.000Z",
    createdAt: "2026-09-22T10:00:00.000Z",
    ...overrides,
  };
}

function source(overrides: Partial<IOperationDefSource> = {}): IOperationDefSource {
  return {
    findByKindAndName: vi.fn(async () => undefined),
    listByKind: vi.fn(async () => []),
    ...overrides,
  };
}

describe("ManeuverRegistry", () => {
  it("bilinen manevra ismini çözer — ok(kayıt)", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("bsc_prepare")],
    });
    const result = await registry.resolve("maneuver", "bsc_prepare");
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().name).toBe("bsc_prepare");
  });

  it("bilinen operasyon ismini çözer — ok(kayıt)", async () => {
    const registry = new ManeuverRegistry({
      operations: [operation("field_charge")],
    });
    const result = await registry.resolve("operation", "field_charge");
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().steps).toHaveLength(1);
  });

  it("bilinmeyen isim → err({kind: not_found}) — throw YOK", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("bsc_prepare")],
    });
    const result = await registry.resolve("maneuver", "yok");
    expect(result.isOk()).toBe(false);
    expect(result.error()).toEqual({
      kind: "not_found",
      recordType: "maneuver",
      name: "yok",
    });
  });

  it("tür ayrımı: manevra ismi operasyon türünde çözülmez", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("bsc_prepare")],
      operations: [operation("field_charge")],
    });
    expect((await registry.resolve("operation", "bsc_prepare")).isOk()).toBe(false);
    expect((await registry.resolve("maneuver", "field_charge")).isOk()).toBe(false);
  });

  it("boş kayıt seti — her isim not_found", async () => {
    const registry = new ManeuverRegistry({});
    expect((await registry.resolve("maneuver", "x")).isOk()).toBe(false);
    expect((await registry.resolve("operation", "y")).isOk()).toBe(false);
  });

  it("aynı isimde iki DOSYA manevrası → kurulumda THROW (fail-fast)", () => {
    expect(
      () =>
        new ManeuverRegistry({
          maneuvers: [maneuver("bsc_prepare"), maneuver("bsc_prepare")],
        }),
    ).toThrow(/mukerrer|tekrar|duplicate|zaten kayitli/i);
  });

  it("manevra ve operasyon aynı isimde olabilir (ayrı ad uzayları)", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("ortak")],
      operations: [operation("ortak")],
    });
    expect((await registry.resolve("maneuver", "ortak")).isOk()).toBe(true);
    expect((await registry.resolve("operation", "ortak")).isOk()).toBe(true);
  });
});

describe("ManeuverRegistry — hibrit (DB > dosya, §11.1)", () => {
  it("DB kaydı dosya kaydını GÖLGELER (öncelik DB)", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("pcs_charge")],
      source: source({
        findByKindAndName: vi.fn(async () =>
          dbDef("maneuver", "pcs_charge", {
            definition: maneuver("pcs_charge"),
          }),
        ),
      }),
    });
    const result = await registry.resolve("maneuver", "pcs_charge");
    expect(result.isOk()).toBe(true);
  });

  it("disabled DB kaydı → err({kind: disabled}) — dosyaya DÜŞMEZ", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("bakim")],
      source: source({
        findByKindAndName: vi.fn(async () =>
          dbDef("maneuver", "bakim", { enabled: false }),
        ),
      }),
    });
    const result = await registry.resolve("maneuver", "bakim");
    expect(result.isOk()).toBe(false);
    expect(result.error()).toEqual({
      kind: "disabled",
      recordType: "maneuver",
      name: "bakim",
    });
  });

  it("DB'de yoksa dosyaya düşer", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("fl01_start")],
      source: source(), // hepsi undefined
    });
    const result = await registry.resolve("maneuver", "fl01_start");
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().name).toBe("fl01_start");
  });

  it("list: enabled DB kayıtları + gölgelenmeyen dosya kayıtları", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: [maneuver("fl01_start"), maneuver("fl03_emergency_stop")],
      source: source({
        listByKind: vi.fn(async () => [
          dbDef("maneuver", "admin_arbitraj"),
          dbDef("maneuver", "fl01_start", { enabled: false }),
        ]),
      }),
    });
    const records = await registry.list("maneuver");
    const names = records.map((r) => r.name);
    expect(names).toContain("admin_arbitraj");
    expect(names).toContain("fl03_emergency_stop");
    expect(names).not.toContain("fl01_start"); // disabled DB gölgesi
  });
});
