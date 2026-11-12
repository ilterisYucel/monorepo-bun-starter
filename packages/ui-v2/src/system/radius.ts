/** Radius ölçeği — nested elemanlar bir kademe düşer (16 → 12 → 8). */
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADIUS;
