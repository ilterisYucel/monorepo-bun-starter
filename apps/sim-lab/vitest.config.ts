import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Workspace kökü — `bun.lock` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findWorkspaceRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(resolve(dir, "bun.lock")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};
const workspaceRoot = findWorkspaceRoot(__dirname);

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@gd-monorepo/shared-types": resolve(workspaceRoot, "packages/shared-types/src"),
      "@gd-monorepo/result": resolve(workspaceRoot, "packages/result/src"),
      "@gd-monorepo/core": resolve(workspaceRoot, "packages/core/src"),
      "@gd-monorepo/simulators": resolve(workspaceRoot, "packages/simulators/src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/http/**/*.test.ts"],
  },
});
