import { describe, it, expect } from "vitest";
import { resolveBscPcsTarget } from "./host";
import type { BscPcsMapping } from "./bsc-pcs-connector";

const mapping = (): BscPcsMapping =>
  ({
    target: { host: "file-host", port: 1 },
    intervalMs: 5000,
    mappings: [],
  }) as BscPcsMapping;

describe("resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)", () => {
  it("env hedefi uygulanır (mevcut davranış)", () => {
    const out = resolveBscPcsTarget(mapping(), undefined, { host: "env-host", port: 15502 });
    expect(out.target).toMatchObject({ host: "env-host", port: 15502 });
  });

  it("connector.sim.target env'i EZER (per-connector port)", () => {
    const out = resolveBscPcsTarget(mapping(), { port: 15503 }, { host: "env-host", port: 15502 });
    expect(out.target).toMatchObject({ host: "env-host", port: 15503 });
  });

  it("ikisi de tanımsızsa dosya hedefi korunur", () => {
    const out = resolveBscPcsTarget(mapping(), undefined, undefined);
    expect(out.target).toMatchObject({ host: "file-host", port: 1 });
  });
});
