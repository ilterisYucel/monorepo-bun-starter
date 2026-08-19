// PanelCardMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface PanelCardMeta {
  measured: boolean;
  barSlot: { x: number; y: number; width: number; height: number };
}

export const PANELCARD_META: PanelCardMeta = {
  measured: true,
  barSlot: { x: 0.13333, y: 0.31500, width: 0.72500, height: 0.55500 },
};
