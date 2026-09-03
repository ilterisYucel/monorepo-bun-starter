import { describe, it, expect, afterEach, vi } from "vitest";
import { ConfigLoader, EnvSource, ALL_CONFIG_DEFINITIONS } from "@gd-monorepo/shared-utils";
import { authConfig, seedUsers, fieldConnectorConfig, siteFieldConfig, mfaRequiredRoles } from "./default";

/**
 * default.ts T1.6 + T2.3 sözleşmesi:
 * - Seed kullanıcıları `mustChangePassword: true` ile üretilir.
 * - field/boss tier'da SEED_*_PASSWORD zorunludur — yoksa fırlatır
 *   (fail-fast); container tier dev default'larını korur.
 * - field/boss tier'da dev/default JWT_SECRET ile açılış REDDEDİLİR.
 * - T2.3: fieldConnectorConfig — kapalıysa undefined; etkinse
 *   FIELD_WS_URL/CONTAINER_TOKEN/CONTAINER_ID zorunlu (fail-fast);
 *   virgüllü URL listesi ayrıştırılır; yalnızca container tier'da geçerli.
 */

function makeLoader(env: Record<string, string> = {}): ConfigLoader {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    process.env[key] = env[key];
  }
  const loader = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [new EnvSource()]);
  loader.load();
  for (const key of Object.keys(saved)) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  return loader;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ["SERVICE_TIER", "JWT_SECRET", "SEED_ADMIN_PASSWORD", "SEED_BOSS_PASSWORD", "SEED_GUEST_PASSWORD", "FIELD_CONNECT_ENABLED", "FIELD_WS_URL", "CONTAINER_TOKEN", "CONTAINER_ID", "FIELD_ID", "FIELD_NAME", "MFA_ENABLED", "AUTH_MFA_REQUIRED_ROLES"]) {
    delete process.env[key];
  }
});

describe("seedUsers (T1.6 + 2026-08-30)", () => {
  it("container tier: dev default'ları + admin/boss mustChangePassword true, guest FALSE (otomatik guest)", () => {
    const seeds = seedUsers();
    expect(seeds).toHaveLength(3);
    expect(seeds[0].mustChangePassword).toBe(true); // admin
    expect(seeds[1].mustChangePassword).toBe(true); // boss
    expect(seeds[2].mustChangePassword).toBe(false); // guest
    expect(seeds[0].password).toBe("admin123");
  });

  it("field tier: SEED_*_PASSWORD yoksa fırlatır (fail-fast)", () => {
    process.env.SERVICE_TIER = "field";
    expect(() => seedUsers()).toThrow();
  });

  it("field tier: env şifreleri kullanılır; guest bayrağı false kalır", () => {
    process.env.SERVICE_TIER = "field";
    process.env.SEED_ADMIN_PASSWORD = "guclu-admin-parola";
    process.env.SEED_BOSS_PASSWORD = "guclu-boss-parola";
    process.env.SEED_GUEST_PASSWORD = "guclu-guest-parola";
    const seeds = seedUsers();
    expect(seeds[0].password).toBe("guclu-admin-parola");
    expect(seeds.filter((s) => s.role === "admin").every((s) => s.mustChangePassword)).toBe(true);
    expect(seeds.filter((s) => s.role === "boss").every((s) => s.mustChangePassword)).toBe(true);
    expect(seeds.find((s) => s.role === "guest")?.mustChangePassword).toBe(false);
  });

  it("field tier: 8 karakterden kısa env değeri de fırlatır", () => {
    process.env.SERVICE_TIER = "field";
    process.env.SEED_ADMIN_PASSWORD = "kisa";
    expect(() => seedUsers()).toThrow();
  });
});

describe("authConfig (T1.6)", () => {
  it("field tier + dev secret → fırlatır", () => {
    const loader = makeLoader({ SERVICE_TIER: "field" });
    expect(() => authConfig(loader)).toThrow();
  });

  it("field tier + geçerli secret → ok", () => {
    const loader = makeLoader({
      SERVICE_TIER: "field",
      JWT_SECRET: "uzun-ve-guvenli-bir-jwt-secret-degeri-12345",
    });
    const cfg = authConfig(loader);
    expect(cfg.jwtSecret).toBe("uzun-ve-guvenli-bir-jwt-secret-degeri-12345");
  });

  it("container tier + dev secret → ok (dev ortamı)", () => {
    const loader = makeLoader({ SERVICE_TIER: "container" });
    expect(authConfig(loader).jwtSecret).toBe("dev-secret-change-in-production");
  });
});

describe("fieldConnectorConfig (T2.3)", () => {
  const fullEnv = {
    SERVICE_TIER: "container",
    FIELD_CONNECT_ENABLED: "true",
    FIELD_WS_URL: "ws://field-a:5002, ws://field-b:5002",
    CONTAINER_TOKEN: "service-token-abcdef",
    CONTAINER_ID: "container-1",
  };

  it("kapalıysa undefined döner", () => {
    const loader = makeLoader({ SERVICE_TIER: "container" });
    expect(fieldConnectorConfig(loader, "container")).toBeUndefined();
  });

  it("etkinse URL listesi + token + containerId ayrıştırılır", () => {
    const loader = makeLoader(fullEnv);
    const cfg = fieldConnectorConfig(loader, "container");
    expect(cfg).toBeDefined();
    expect(cfg?.wsUrls).toEqual(["ws://field-a:5002", "ws://field-b:5002"]);
    expect(cfg?.token).toBe("service-token-abcdef");
    expect(cfg?.containerId).toBe("container-1");
    expect(cfg?.heartbeatIntervalMs).toBe(15000);
    expect(cfg?.telemetryIntervalMs).toBe(15000);
  });

  it("etkin ama URL yoksa fail-fast fırlatır", () => {
    const loader = makeLoader({
      ...fullEnv,
      FIELD_WS_URL: "",
    });
    expect(() => fieldConnectorConfig(loader, "container")).toThrow();
  });

  it("etkin ama token yoksa fail-fast fırlatır", () => {
    const loader = makeLoader({ ...fullEnv, CONTAINER_TOKEN: "" });
    expect(() => fieldConnectorConfig(loader, "container")).toThrow();
  });

  it("etkin ama containerId yoksa fail-fast fırlatır", () => {
    const loader = makeLoader({ ...fullEnv, CONTAINER_ID: "" });
    expect(() => fieldConnectorConfig(loader, "container")).toThrow();
  });

  it("ws:// veya wss:// olmayan URL reddedilir", () => {
    const loader = makeLoader({ ...fullEnv, FIELD_WS_URL: "http://field:5002" });
    expect(() => fieldConnectorConfig(loader, "container")).toThrow();
  });

  it("field tier'da etkin = hata", () => {
    const loader = makeLoader({ ...fullEnv, SERVICE_TIER: "field" });
    expect(() => fieldConnectorConfig(loader, "field")).toThrow();
  });

  it("tek URL de geçerli", () => {
    const loader = makeLoader({ ...fullEnv, FIELD_WS_URL: "wss://field.local/ws" });
    const cfg = fieldConnectorConfig(loader, "container");
    expect(cfg?.wsUrls).toEqual(["wss://field.local/ws"]);
  });
});

/**
 * siteFieldConfig sözleşmesi (2026-08-28 — env'den saha kimliği):
 * - field tier: FIELD_ID zorunlu + geçerli UUID; eksik/bozuk değer fail-fast.
 * - container/boss tier: undefined döner (FIELD_ID opsiyonel — ileride boss).
 * - FIELD_NAME opsiyonel; yoksa varsayılan "Saha".
 */
const VALID_FIELD_ID = "5d5e49dc-7757-4f3e-a026-0263c2966bc6";

describe("siteFieldConfig (FIELD_ID env)", () => {
  it("field tier + geçerli UUID → config döner", () => {
    const loader = makeLoader({ SERVICE_TIER: "field", FIELD_ID: VALID_FIELD_ID });
    const cfg = siteFieldConfig(loader, "field");
    expect(cfg).toEqual({ fieldId: VALID_FIELD_ID, fieldName: "Saha" });
  });

  it("field tier + FIELD_ID yoksa fail-fast fırlatır", () => {
    const loader = makeLoader({ SERVICE_TIER: "field" });
    expect(() => siteFieldConfig(loader, "field")).toThrow(/FIELD_ID/);
  });

  it("field tier + geçersiz UUID fail-fast fırlatır", () => {
    const loader = makeLoader({
      SERVICE_TIER: "field",
      FIELD_ID: "saha-bir",
    });
    expect(() => siteFieldConfig(loader, "field")).toThrow(/UUID/);
  });

  it("field tier + FIELD_NAME env'den isim alır", () => {
    process.env.FIELD_NAME = "Gunes Santrali";
    const loader = makeLoader({ SERVICE_TIER: "field", FIELD_ID: VALID_FIELD_ID });
    const cfg = siteFieldConfig(loader, "field");
    expect(cfg?.fieldName).toBe("Gunes Santrali");
  });

  it("container tier → undefined (FIELD_ID opsiyonel)", () => {
    const loader = makeLoader({ SERVICE_TIER: "container", FIELD_ID: VALID_FIELD_ID });
    expect(siteFieldConfig(loader, "container")).toBeUndefined();
  });

  it("boss tier → undefined (çok saha ileride)", () => {
    const loader = makeLoader({ SERVICE_TIER: "boss", FIELD_ID: VALID_FIELD_ID });
    expect(siteFieldConfig(loader, "boss")).toBeUndefined();
  });
});

/**
 * mfaRequiredRoles sözleşmesi (2026-08-28 — MFA_ENABLED debug flag'i):
 * - field/boss tier varsayılan: ["admin", "teknik"] (Faz 6 davranışı korunur).
 * - MFA_ENABLED=false → [] (enforcement kapalı — debug/geçici kurulum).
 * - AUTH_MFA_REQUIRED_ROLES boş string → [] (açık kapatma da mümkün).
 * - container tier her zaman [].
 */
describe("mfaRequiredRoles (MFA_ENABLED flag)", () => {
  it("field tier varsayılan: admin,teknik", () => {
    const loader = makeLoader({ SERVICE_TIER: "field" });
    expect(mfaRequiredRoles(loader, "field")).toEqual(["admin", "teknik"]);
  });

  it("MFA_ENABLED=false → [] (debug)", () => {
    const loader = makeLoader({ SERVICE_TIER: "field", MFA_ENABLED: "false" });
    expect(mfaRequiredRoles(loader, "field")).toEqual([]);
  });

  it("MFA_ENABLED=false + AUTH_MFA_REQUIRED_ROLES dolu → yine [] (bayrak öncelikli)", () => {
    const loader = makeLoader({
      SERVICE_TIER: "boss",
      MFA_ENABLED: "false",
      AUTH_MFA_REQUIRED_ROLES: "admin,boss",
    });
    expect(mfaRequiredRoles(loader, "boss")).toEqual([]);
  });

  it("AUTH_MFA_REQUIRED_ROLES boş string → []", () => {
    const loader = makeLoader({
      SERVICE_TIER: "field",
      AUTH_MFA_REQUIRED_ROLES: "",
    });
    expect(mfaRequiredRoles(loader, "field")).toEqual([]);
  });

  it("container tier her zaman []", () => {
    const loader = makeLoader({ SERVICE_TIER: "container" });
    expect(mfaRequiredRoles(loader, "container")).toEqual([]);
  });
});
