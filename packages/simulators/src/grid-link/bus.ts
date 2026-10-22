// packages/simulators/src/grid-link/bus.ts
//
// Şebeke yolu eşleşmesi (SEBEKE-YOLU-ESLESMESI SPEC K1/K3).
// gdems computeEnergization semantiği: POI H01 → fider kesici (H04/H05) → RMU H02.
// Zincir kopuksa PCS de-enerjilidir (standby, güç 0, Vac 0).
//
// Bus in-process'tir: MV simülatörü yayınlar, PCS simülatörü sorgular
// (aynı device-service süreci — field tier).

/** PCS'in enerji zinciri sorgusu (PCS bu arayüze bağımlı, MV sınıfına değil). */
export interface IGridLink {
  /** Fiderin enerjili olup olmadığı (H01 ∧ fider ∧ H02). */
  isEnergized(feeder: string): boolean;
}

/**
 * GridLinkBus — MV şalter pozisyonlarını tutan paylaşımlı durum.
 *
 * Sözleşme:
 * - `setBreaker(cell, closed)` komuttur (void); bilinmeyen hücre adı kabul edilir
 *   (config'ten gelen isim serbesttir).
 * - `isEnergized(feeder)` sorgudur: H01 kapalı ∧ fider kapalı ∧ H02 kapalı.
 * - Hiç yayın gelmemiş hücre "kapalı" varsayılır (başlangıç: tüm kesiciler kapalı).
 */
export class GridLinkBus implements IGridLink {
  private readonly closed = new Map<string, boolean>();

  setBreaker(cell: string, closed: boolean): void {
    this.closed.set(cell, closed);
  }

  isEnergized(feeder: string): boolean {
    return this.cellClosed("H01") && this.cellClosed(feeder) && this.cellClosed("H02");
  }

  private cellClosed(cell: string): boolean {
    return this.closed.get(cell) ?? true;
  }
}
