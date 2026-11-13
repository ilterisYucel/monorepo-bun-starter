// Solver uç kontratı kanıtları — SPEC SIMULATOR-PIPE §6.4 (UC-4).
// AK-4.1: tip seçimi + fail-fast · AK-4.2: solver yalnız pipe uçlarından beslenir.
import { describe, expect, it } from "vitest";
import { PipeSet } from "./pipe";
import {
  GridChainSolver,
  SolverRegistry,
  createDefaultSolverRegistry,
  type SolverDeps,
} from "./solver-ports";

const deps = (pipes: PipeSet, branches: { cell: string; energized: boolean }[]): SolverDeps => ({
  pipes,
  stationId: "DEMO-MV-1",
  branches: () => branches,
});

describe("SolverRegistry — UC-4", () => {
  it("AK-4.1: aynı tip iki kez kaydedilemez — yazım hatası sessiz geçmez", () => {
    const registry = new SolverRegistry();
    const builder = (d: SolverDeps): GridChainSolver => new GridChainSolver(d);
    registry.register("grid-chain", builder);
    expect(() => registry.register("grid-chain", builder)).toThrow(/tip zaten kayıtlı: grid-chain/);
  });

  it("AK-4.1: bilinmeyen tip fail-fast; mesaj kayıtlı tipleri listeler", () => {
    const registry = new SolverRegistry();
    registry.register("grid-chain", (d) => new GridChainSolver(d));
    expect(registry.has("grid-chain")).toBe(true);
    expect(registry.has("yok")).toBe(false);
    expect(() => registry.create("yok", deps(new PipeSet(), []))).toThrow(
      /bilinmeyen solver tipi: yok \(kayıtlı: grid-chain\)/,
    );
  });
});

describe("GridChainSolver — UC-4", () => {
  it("AK-4.2: dal enerjizasyonunu pipe'a yayınlar, cihaz nesnesine dokunmaz", () => {
    const pipes = new PipeSet();
    const registry = createDefaultSolverRegistry();
    const solver = registry.create(
      "grid-chain",
      deps(pipes, [
        { cell: "H04", energized: false },
        { cell: "H05", energized: true },
      ]),
    );
    expect(solver.kind).toBe("grid-chain");
    solver.step(0.5, 7);

    // commit öncesi görünmez (K3)
    expect(pipes.read("branch.H04.energized")).toBeUndefined();
    pipes.commit();
    const h04 = pipes.read("branch.H04.energized");
    expect(h04?.value).toBe(false);
    expect(h04?.source).toBe("DEMO-MV-1");
    expect(h04?.tick).toBe(7);
    expect(pipes.read("branch.H05.energized")?.value).toBe(true);
  });
});
