// PanelCardMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface PanelCardMeta {
  measured: boolean;
  barSlot: { x: number; y: number; width: number; height: number };
}

export const PANELCARD_META: PanelCardMeta = {
  measured: true,
  barSlot: { x: 0.10000, y: 0.19000, width: 0.46667, height: 0.70000 },
};
