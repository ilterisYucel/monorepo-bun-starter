/**
 * Tipografi ölçeği — IBM Plex Sans, çift sayılı boyutlar, sabit px line-height.
 * Kaynak: "GD-EMS · Design system guide" §Typography.
 */
export const FONT_FAMILY = "'IBM Plex Sans', system-ui, sans-serif";

export const TYPE = {
  display: { fontSize: 26, lineHeight: 32, fontWeight: 600 },
  kpiL: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
  kpiM: { fontSize: 22, lineHeight: 28, fontWeight: 600 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
  value: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  heading: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  body: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  caption: { fontSize: 10, lineHeight: 14, fontWeight: 500 },
  badge: { fontSize: 10, lineHeight: 12, fontWeight: 600, letterSpacing: 0.4 },
  micro: { fontSize: 8, lineHeight: 12, fontWeight: 700, letterSpacing: 0.48 },
} as const;

export type TypeToken = keyof typeof TYPE;

/**
 * Ekran (dashboard/core) ölçeği — Figma ekranlarındaki gerçek 1.2× line-height
 * değerleri (K-6: rehberin 4 px snap'i değil, UX çıktısı). Primitifler TYPE
 * kullanır; dashboard/core bileşenleri COMPACT kullanır.
 */
export const COMPACT = {
  display: { fontSize: 26, lineHeight: 31.2, fontWeight: 600 },
  kpiL: { fontSize: 24, lineHeight: 28.8, fontWeight: 600 },
  kpiM: { fontSize: 22, lineHeight: 26.4, fontWeight: 600 },
  title: { fontSize: 18, lineHeight: 21.6, fontWeight: 600 },
  value: { fontSize: 16, lineHeight: 19.2, fontWeight: 600 },
  heading: { fontSize: 14, lineHeight: 16.8, fontWeight: 600 },
  label: { fontSize: 12, lineHeight: 14.4, fontWeight: 600 },
  body: { fontSize: 12, lineHeight: 14.4, fontWeight: 500 },
  caption: { fontSize: 10, lineHeight: 12, fontWeight: 500 },
  badge: { fontSize: 10, lineHeight: 12, fontWeight: 600, letterSpacing: 0.4 },
  micro: { fontSize: 8, lineHeight: 9.6, fontWeight: 700, letterSpacing: 0.65 },
  tiny: { fontSize: 9, lineHeight: 10.8, fontWeight: 600, letterSpacing: 0.6 },
  small: { fontSize: 11, lineHeight: 13.2, fontWeight: 600, letterSpacing: 0.4 },
  reading: { fontSize: 20, lineHeight: 24, fontWeight: 600 },
} as const;

export type CompactTypeToken = keyof typeof COMPACT;
