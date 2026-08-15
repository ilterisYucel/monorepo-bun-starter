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
  lampCluster: { x: 0.40658, y: 0.09107, width: 0.18553, height: 0.26607 },
  keyCluster: { x: 0.34474, y: 0.44286, width: 0.30921, height: 0.09107 },
};
