// DCOutputMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface DCOutputMeta {
  measured: boolean;
  display: { x: number; y: number; width: number; height: number };
}

export const DCOUTPUT_META: DCOutputMeta = {
  measured: true,
  display: { x: 0.24500, y: 0.70982, width: 0.57500, height: 0.22321 },
};
