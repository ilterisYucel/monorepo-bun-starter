// RackCell sprite meta: AI çıktısındaki pencere/hücre kolonu konumları.
// tools/measure-rackmeta.mjs tarafından üretilir.
// Değerler gövde boyutlarına (120x380 referans) ORAN olarak saklanır.
// windowsMeasured=false, columnMeasured=true
export interface RackCellWindowMeta {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RackCellMeta {
  windowsMeasured: boolean;
  columnMeasured: boolean;
  windows: RackCellWindowMeta[];
  tube: RackCellWindowMeta;
}

export const RACKCELL_META: RackCellMeta = {
  windowsMeasured: false,
  columnMeasured: true,
  windows: [
    { x: 0.14000, y: 0.09211, width: 0.52000, height: 0.10000 },
    { x: 0.14000, y: 0.21316, width: 0.52000, height: 0.10000 },
    { x: 0.14000, y: 0.33421, width: 0.52000, height: 0.10000 },
    { x: 0.14000, y: 0.45526, width: 0.52000, height: 0.10000 },
    { x: 0.14000, y: 0.57632, width: 0.52000, height: 0.10000 },
    { x: 0.14000, y: 0.69737, width: 0.52000, height: 0.10000 },
  ],
  tube: { x: 0.76250, y: 0.13684, width: 0.23750, height: 0.79737 },
};
