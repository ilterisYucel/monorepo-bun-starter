/**
 * Katman config'leri için ortak ayarlar — SPEC v2 / K15.
 *
 * `root` bu dizindir; CLI cwd'si (repo kökü) taranmaz → .stryker-tmp sızması olmaz.
 */
import { fileURLToPath } from "node:url";
import type { UserConfig } from "vitest/config";

export const integrationBase = (include: string[]): UserConfig => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    environment: "node",
    globals: true,
    include,
    exclude: ["**/node_modules/**", "**/.stryker-tmp/**", "**/dist/**"],
    testTimeout: 150_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
