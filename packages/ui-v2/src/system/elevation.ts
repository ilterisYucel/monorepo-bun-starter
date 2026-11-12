/** Gölgeler — tümü #0F1A33 tabanlı. */
export const ELEVATION = {
  small: "0 1px 3px rgba(15, 26, 51, 0.10)",
  card: "0 6px 18px rgba(15, 26, 51, 0.07)",
  medium: "0 10px 28px rgba(15, 26, 51, 0.16)",
  large: "0 24px 60px rgba(15, 26, 51, 0.22)",
  drawer: "-12px 0 40px rgba(15, 26, 51, 0.20)",
} as const;

export type ElevationToken = keyof typeof ELEVATION;
