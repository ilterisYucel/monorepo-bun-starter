// FirePanelMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface FirePanelMeta {
  measured: boolean;
  lampCluster: { x: number; y: number; width: number; height: number };
  keyCluster: { x: number; y: number; width: number; height: number };
}

export const FIREPANEL_META: FirePanelMeta = {
  measured: true,
  lampCluster: { x: 0.40921, y: 0.14464, width: 0.18421, height: 0.21607 },
  keyCluster: { x: 0.35132, y: 0.44464, width: 0.29474, height: 0.08750 },
};
