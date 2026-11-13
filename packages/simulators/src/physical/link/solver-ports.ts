// Solver uç kontratı — sayısal enerji dengesi solver'ları pipe uçlarından beslenir (SPEC §6.4).
//
// Sözleşme:
// - Solver cihaz nesnelerine DOKUNMAZ: terminal sinyallerini `pipes` üzerinden okur,
//   sonuçlarını yayınlar (K4). Sayısal içerik solver'ın kendi modülünde yaşar.
// - Tip site JSON'dan seçilir (`sim.solvers`); bilinmeyen tip FAIL-FAST (FR-4.1) —
//   sessiz varsayılana düşülmez.
// - Yeni solver = modül + registry satırı (SIMULATORS-MIMARISI K7 deseni).

import type { PipeSet } from "./pipe";

/** Fizik adımı sözleşmesi. `kind` config anahtarıdır (DTO alanı). */
export interface ISolver {
  readonly kind: string;
  /** Komut — bir adım: uçları oku, sonuçları pipe'a yayınla. */
  step(dt: number, tick: number): void;
}

/** Bir dalın enerjizasyon sorgusu (grid-chain girdisi). */
export interface BranchState {
  readonly cell: string;
  readonly energized: boolean;
}

/** Solver kurulum bağımlılıkları — site JSON'daki tip anahtarı bunlarla kurulur. */
export interface SolverDeps {
  readonly pipes: PipeSet;
  readonly stationId: string;
  readonly branches: () => ReadonlyArray<BranchState>;
}

export type SolverBuilder = (deps: SolverDeps) => ISolver;

/**
 * Solver registry — tip anahtarı → kurucu.
 * `create` bilinmeyen anahtarda hata fırlatır (fail-fast; sessiz varsayılan YOK).
 */
export class SolverRegistry {
  private readonly builders = new Map<string, SolverBuilder>();

  /** Komut — tip kaydı; aynı anahtar tekrar kaydedilirse hata (yazım hatası sessiz geçmesin). */
  register(kind: string, builder: SolverBuilder): void {
    if (this.builders.has(kind)) throw new Error(`[solver] tip zaten kayıtlı: ${kind}`);
    this.builders.set(kind, builder);
  }

  /** Sorgu — tip kayıtlı mı. */
  has(kind: string): boolean {
    return this.builders.has(kind);
  }

  /** Üretim — seçilen tipi kurar; bilinmeyen tip fail-fast. */
  create(kind: string, deps: SolverDeps): ISolver {
    const builder = this.builders.get(kind);
    if (builder === undefined) {
      throw new Error(
        `[solver] bilinmeyen solver tipi: ${kind} (kayıtlı: ${[...this.builders.keys()].join(", ")})`,
      );
    }
    return builder(deps);
  }
}

/** Grid-chain solver — dal enerjizasyonunu (H01 ∧ fider ∧ H02) her adımda yayınlar. */
export class GridChainSolver implements ISolver {
  readonly kind = "grid-chain";

  constructor(private readonly deps: SolverDeps) {}

  step(_dt: number, tick: number): void {
    for (const branch of this.deps.branches()) {
      this.deps.pipes.publish({
        name: `branch.${branch.cell}.energized`,
        value: branch.energized,
        tick,
        source: this.deps.stationId,
      });
    }
  }
}

/** Yerleşik solver'lar — yeni tip buraya bir satır eklenir. */
export function createDefaultSolverRegistry(): SolverRegistry {
  const registry = new SolverRegistry();
  registry.register("grid-chain", (deps) => new GridChainSolver(deps));
  return registry;
}
