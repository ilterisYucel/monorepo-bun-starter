// device-service simülatör yüzeyi yokluğu — SPEC DEVICE-SERVICE-SADELESTIRME AK-1.1/K1.
// Statik bekçi: servis yalnız istemcidir; hiçbir Modbus sunucusu / inject ucu açmaz
// ve simülatör paketine bağımlı değildir.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const serviceRoot = resolve(__dirname, "..");
const SIMULATOR_PACKAGE = ["@gd-monorepo", "simulators"].join("/");

const sourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (full.endsWith(".ts") && !full.endsWith(".test.ts")) out.push(full);
  }
  return out;
};

describe("device-service — simülatör yüzeyi yok", () => {
  it("AK-1.1: run.ts sunucu/inject ucu açmaz", () => {
    const run = readFileSync(resolve(serviceRoot, "run.ts"), "utf8");
    expect(run).not.toMatch(/SimulatorHost/);
    expect(run).not.toMatch(/DebugInjector/);
    expect(run).not.toMatch(/\.listen\(/);
    expect(run).not.toMatch(/debug-injector/);
  });

  it("AK-1.3: simülatör paketi bağımlılığı ve import'u yok", () => {
    const pkg = JSON.parse(readFileSync(resolve(serviceRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.[SIMULATOR_PACKAGE]).toBeUndefined();
    expect(pkg.devDependencies?.[SIMULATOR_PACKAGE]).toBeUndefined();

    for (const file of sourceFiles(resolve(serviceRoot, "src"))) {
      expect(readFileSync(file, "utf8")).not.toContain(SIMULATOR_PACKAGE);
    }
  });
});
