/**
 * Dark tema renk token'ları — referans konsol (`gdpms-console/gdems`) dark
 * paletinin birebir karşılığı (SPEC K-2).
 *
 * Mevcut `tokens.ts` (diğer app'lerin koyu seti) DEĞİŞTİRİLMEZ; bu set yalnızca
 * demo/nova ekranları için eklenir. İsimler light setiyle birebir aynıdır, böylece
 * `apply-nova-vars.ts` tema başına aynı `--nm-*` değişkenlerini yazabilir.
 *
 * Kural (AGENTS-UI.md): hiçbir dosyada ham hex hardcode edilmez — bu token'lar
 * kullanılır.
 */
const darkTokens = {
  // ---- Status ----
  alarm: "#ff6a4d",
  warn: "#efb93a",
  maint: "#b39cf0",
  cold: "#5aa7ff",
  info: "#6caef0",
  ok: "#4ac98b",

  // ---- Surface ----
  bg: "#0e1215",
  panel: "#151a1f",
  panel2: "#1a2026",
  sym: "#151a1f",

  // ---- Border ----
  line: "#2b343c",
  line2: "#222a31",

  // ---- Text ----
  fg: "#dbe2e8",
  muted: "#8e9aa5",
  dim: "#5f6b76",

  // ---- Conductors / selection ----
  live: "#c9d3dc",
  dead: "#3b444d",
  sel: "#6cb4ff",

  // ---- Power flow (K-2): deşarj turuncu, şarj teal ----
  discharge: "#f2a24a",
  charge: "#3fd3bf",

  // ---- Chart series ----
  cSoc: "#62aef0",
  cPow: "#45c4b2",
  cSp: "#8e9aa5",
  cHot: "#ff6a4d",
  cCold: "#5aa7ff",

  // ---- RGB üçlüleri (diverging/sequential dolgular) ----
  hotRgb: "#ff5c40",
  coldRgb: "#50a0ff",
  seqRgb: "#56b0e4",
  midRgb: "#96a5b2",
} as const;

export const COLORS_DARK = darkTokens;

export type DarkColorToken = keyof typeof darkTokens;

export const COLOR_DARK: Record<DarkColorToken, number> = Object.fromEntries(
  Object.entries(darkTokens).map(([k, v]) => [k, Number.parseInt(v.slice(1), 16)]),
) as Record<DarkColorToken, number>;
