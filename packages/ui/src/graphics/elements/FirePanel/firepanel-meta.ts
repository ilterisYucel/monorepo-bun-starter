// FirePanelMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface FirePanelMeta {
  measured: boolean;
  lampCluster: { x: number; y: number; width: number; height: number };
  keyCluster: { x: number; y: number; width: number; height: number };
}

export const FIREPANEL_META: FirePanelMeta = {
  measured: false,
  lampCluster: { x: 0.51579, y: 0.35714, width: 0.08289, height: 0.01429 },
  keyCluster: { x: 0.35000, y: 0.46000, width: 0.30000, height: 0.05710 },
};
