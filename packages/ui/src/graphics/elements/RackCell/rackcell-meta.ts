// RackCell sprite meta: AI çıktısındaki pencere/hücre kolonu konumları.
// tools/measure-rackmeta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına (120x380 referans) ORAN olarak saklanır.
// measured=true (false ise tasarım fallback geometrisi)
export interface RackCellWindowMeta {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RackCellMeta {
  measured: boolean;
  windows: RackCellWindowMeta[];
  tube: RackCellWindowMeta;
}

export const RACKCELL_META: RackCellMeta = {
  measured: true,
  windows: [
    { x: 0.17500, y: 0.12632, width: 0.51250, height: 0.10395 },
    { x: 0.17500, y: 0.24737, width: 0.51250, height: 0.10263 },
    { x: 0.17500, y: 0.36842, width: 0.38750, height: 0.09868 },
    { x: 0.17500, y: 0.48947, width: 0.38750, height: 0.09868 },
    { x: 0.17500, y: 0.61053, width: 0.38750, height: 0.09868 },
    { x: 0.17500, y: 0.73158, width: 0.38750, height: 0.09868 },
  ],
  tube: { x: 0.86667, y: 0.12500, width: 0.20833, height: 0.77368 },
};
