// RackCell sprite meta: AI çıktısındaki batarya plaka stack'i.
// tools/measure-rackmeta.mjs tarafından üretilir.
// Değerler gövde yüksekliğine (380 referans) ORAN olarak saklanır.
// platesMeasured=true
export interface RackCellPlateStackMeta {
  top: number;
  bottom: number;
  count: number;
}

export interface RackCellMeta {
  platesMeasured: boolean;
  plateStack: RackCellPlateStackMeta;
}

export const RACKCELL_META: RackCellMeta = {
  platesMeasured: true,
  plateStack: { top: 0.13421, bottom: 0.61316, count: 12 },
};
