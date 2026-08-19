// EnergyAnalyzerMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface EnergyAnalyzerMeta {
  measured: boolean;
  lcd: { x: number; y: number; width: number; height: number };
}

export const ENERGYANALYZER_META: EnergyAnalyzerMeta = {
  measured: true,
  lcd: { x: 0.02667, y: 0.01974, width: 0.94667, height: 0.65395 },
};
