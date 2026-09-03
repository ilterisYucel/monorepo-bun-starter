import { describe, it, expect, vi } from "vitest";
import { ConfigLoader } from "./loader";
import { EnvSource, ObjectSource } from "./sources";
import type { ConfigDefinition } from "./types";

/**
 * ConfigLoader sözleşmesi (2026-08-30 — T3; TESTING.md borcu):
 * - Kaynak önceliği: düşük öncelik önce okunur, İLK tanımlı değer kazanır
 *   (ObjectSource 5 > EnvSource 10 > default).
 * - Doğrulama hatası load()'da fırlar (anahtar + açıklama bağlamında).
 * - get bilinmeyen anahtarda fırlar.
 * - Birim normalizasyonu: duration-ms/bytes/duration-pg (geçersiz → throw).
 * - redacted(): secret tanımlar "***" maskelenir.
 * - reload(): değişen değerler onChange'e bildirilir (değişmeyen bildirilmez).
 */

const defPort: ConfigDefinition<number> = {
  key: "server.port",
  env: "PORT",
  default: 8080,
  validate: (v) => Number(v),
};

const defTimeout: ConfigDefinition<number> = {
  key: "db.timeoutMs",
  env: "DB_TIMEOUT",
  default: 30000,
  unit: "duration-ms",
};

const defBytes: ConfigDefinition<number> = {
  key: "cache.limit",
  env: "CACHE_LIMIT",
  default: 1048576,
  unit: "bytes",
};

const defSecret: ConfigDefinition<string> = {
  key: "auth.secret",
  env: "AUTH_SECRET",
  default: "dev-secret",
  secret: true,
};

const defStrict: ConfigDefinition<number> = {
  key: "limit.count",
  default: 1,
  validate: (v) => {
    const num = Number(v);
    if (num < 1) throw new Error("en az 1 olmali");
    return num;
  },
};

function makeLoader(
  overrides: Record<string, unknown> = {},
  env: Record<string, string> = {},
): ConfigLoader {
  return new ConfigLoader(
    [defPort, defTimeout, defBytes, defSecret, defStrict],
    [new ObjectSource(overrides), new EnvSource()],
  );
}

describe("ConfigLoader (T3)", () => {
  it("kaynak önceliği: ObjectSource EnvSource'u ezer", () => {
    process.env.PORT = "9090";
    try {
      const loader = makeLoader({ PORT: 7070 });
      loader.load();
      expect(loader.get<number>("server.port")).toBe(7070);
    } finally {
      delete process.env.PORT;
    }
  });

  it("kaynak yoksa default değer kullanılır", () => {
    const loader = makeLoader();
    loader.load();
    expect(loader.get<number>("server.port")).toBe(8080);
  });

  it("EnvSource sayısal değerleri number'a çevirir", () => {
    process.env.PORT = "9090";
    try {
      const loader = makeLoader();
      loader.load();
      expect(loader.get<number>("server.port")).toBe(9090);
    } finally {
      delete process.env.PORT;
    }
  });

  it("validate hatası load()'da anahtar bağlamıyla fırlar", () => {
    const loader = makeLoader({ "limit.count": 0 });
    expect(() => loader.load()).toThrow(/limit.count/);
  });

  it("get bilinmeyen anahtarda fırlar", () => {
    const loader = makeLoader();
    loader.load();
    expect(() => loader.get("tanimsiz.key")).toThrow(/Tanimsiz/);
  });

  it("birim normalizasyonu: duration-ms ve bytes", () => {
    process.env.DB_TIMEOUT = "30s";
    process.env.CACHE_LIMIT = "1KB";
    try {
      const loader = makeLoader();
      loader.load();
      expect(loader.get<number>("db.timeoutMs")).toBe(30_000);
      expect(loader.get<number>("cache.limit")).toBe(1024);
    } finally {
      delete process.env.DB_TIMEOUT;
      delete process.env.CACHE_LIMIT;
    }
  });

  it("geçersiz duration-ms fırlatır", () => {
    process.env.DB_TIMEOUT = "30ss";
    try {
      const loader = makeLoader();
      expect(() => loader.load()).toThrow(/duration/);
    } finally {
      delete process.env.DB_TIMEOUT;
    }
  });

  it("redacted: secret tanımlar maskelenir, diğerleri görünür", () => {
    const loader = makeLoader();
    loader.load();
    const redacted = loader.redacted();
    expect(redacted["auth.secret"]).toBe("***");
    expect(redacted["server.port"]).toBe("8080");
  });

  it("reload: değişen değer onChange'e bildirilir", () => {
    process.env.PORT = "1111";
    const loader = makeLoader();
    try {
      loader.load();
      const handler = vi.fn();
      const unsub = loader.onChange("server.port", handler);

      process.env.PORT = "2222";
      loader.reload();

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0]?.[0] as {
        key: string;
        oldValue: number;
        newValue: number;
      };
      expect(event.key).toBe("server.port");
      expect(event.oldValue).toBe(1111);
      expect(event.newValue).toBe(2222);

      unsub();
      process.env.PORT = "3333";
      loader.reload();
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.PORT;
    }
  });

  it("health: erişilebilir kaynaklar healthy döner", () => {
    const loader = makeLoader();
    const health = loader.health();
    expect(health.healthy).toBe(true);
    expect(health.sources["env"]).toBe(true);
    expect(health.sources["override"]).toBe(true);
  });
});
