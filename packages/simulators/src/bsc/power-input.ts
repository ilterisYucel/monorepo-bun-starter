// packages/simulators/src/bsc/power-input.ts
//
// PCS→BSC güç girdisi (PCS-BSC-GUC-LINKI SPEC K1/K3).
//
// Gerçek sahada BSC'nin güç setpoint'i YOKTUR: DC gücü PCS üretir (Wattox S06),
// BSC yalnız ölçer. Simülatörde bu fiziksel akış dış girdiyle modellenir.

/**
 * BSC dış güç girdisi.
 *
 * Sözleşme:
 * - `applyPowerKw(kw)` komuttur (void); son değer bir sonraki tick'te kullanılır.
 * - İşaret: `kw < 0` şarj (SOC ↑), `kw > 0` deşarj (SOC ↓) — Wattox S06 konvansiyonu.
 * - Sonlu olmayan (NaN/Infinity) değer 0 kabul edilir.
 * - Yan etki: yalnız güç değişkenini yazar; register/SOC güncellemesi tick'tedir.
 */
export interface IBatteryPowerInput {
  applyPowerKw(kw: number): void;
}
