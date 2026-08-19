// RoomCardMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface RoomCardMeta {
  measured: boolean;
  tempSlot: { x: number; y: number; width: number; height: number };
}

export const ROOMCARD_META: RoomCardMeta = {
  measured: true,
  tempSlot: { x: 0.05000, y: 0.05556, width: 0.07500, height: 0.44444 },
};
