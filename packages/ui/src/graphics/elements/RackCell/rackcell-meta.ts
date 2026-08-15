// RackCell sprite meta: AI çıktısındaki pencere/tüp konumları.
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
    { x: 0.18333, y: 0.12632, width: 0.53750, height: 0.10395 },
    { x: 0.18333, y: 0.24737, width: 0.52500, height: 0.10263 },
    { x: 0.18333, y: 0.36974, width: 0.50833, height: 0.10132 },
    { x: 0.18333, y: 0.49211, width: 0.50833, height: 0.10132 },
    { x: 0.18333, y: 0.61447, width: 0.50833, height: 0.10132 },
    { x: 0.18333, y: 0.73684, width: 0.50833, height: 0.10132 },
  ],
  tube: { x: 0.74583, y: 0.12763, width: 0.17083, height: 0.77763 },
};
