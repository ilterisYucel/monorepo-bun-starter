// RoomCardMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface RoomCardMeta {
  measured: boolean;
  tempSlot: { x: number; y: number; width: number; height: number };
}

export const ROOMCARD_META: RoomCardMeta = {
  measured: false,
  tempSlot: { x: 0.01500, y: 0.01670, width: 0.11250, height: 0.51670 },
};
