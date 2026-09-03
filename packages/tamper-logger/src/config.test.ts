import { describe, it, expect, afterAll, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSigningKey, resolveSigningKey } from "./config";

/**
 * T0.5 — signing key kontratı (TESTING.md §8.1):
 *
 * - `loadSigningKey(path)`: dosyayı okur, trim'ler — materyali üretir;
 *   boş materyal/okunamayan dosya fırlatır.
 * - `resolveSigningKey(path, env?)`: env override kazanır; boş env yok
 *   sayılır; dosya yoksa dev fallback + tek uyarı.
 *
 * NOT: TIER_LOGGER_DEFAULTS / loggerConfigForTier tier kontratı
 * `packages/platform/logging` paketine taşındı (bkz.
 * docs/roadmap/platform-paket-yapisi.md Aşama 2).
 */

const dirs: string[] = [];

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "logger-config-"));
  dirs.push(dir);
  return dir;
}

afterAll(async () => {
  await Promise.allSettled(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

describe("LoggerConfig signing key (T0.5)", () => {
  describe("loadSigningKey", () => {
    it("dosyadan anahtar materyalini okur ve trim'ler", async () => {
      const dir = await tmpDir();
      const path = join(dir, "signing.key");
      await writeFile(path, "\n  my-signing-key-123  \n");
      expect(await loadSigningKey(path)).toBe("my-signing-key-123");
    });

    it("dosya yoksa fırlatır", async () => {
      const dir = await tmpDir();
      await expect(loadSigningKey(join(dir, "yok.key"))).rejects.toThrow();
    });
  });

  describe("resolveSigningKey", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("env override kazanır — dosyaya bakılmaz", async () => {
      const dir = await tmpDir();
      const path = join(dir, "k.key");
      await writeFile(path, "file-key");
      expect(await resolveSigningKey(path, "env-key")).toBe("env-key");
    });

    it("boş env override yok sayılır — dosya kullanılır", async () => {
      const dir = await tmpDir();
      const path = join(dir, "k.key");
      await writeFile(path, "  file-key  ");
      expect(await resolveSigningKey(path, "   ")).toBe("file-key");
    });

    it("dosya yoksa dev fallback + uyarı", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const dir = await tmpDir();
      const key = await resolveSigningKey(join(dir, "yok.key"));
      expect(key).toBe("dev-only-signing-key");
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
