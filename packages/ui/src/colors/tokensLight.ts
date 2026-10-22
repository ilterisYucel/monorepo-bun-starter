/**
 * Light tema renk token'ları — NOVA-EMS ışık paleti (SPEC K4).
 *
 * Mevcut koyu `tokens.ts` DEĞİŞTİRİLMEZ; bu set yalnızca yeni demo ekranları
 * için eklenir. İsimler nova semantiğini taşır: `alarm/warn/maint/cold/ok/info`,
 * yüzeyler `bg/panel/panel2/sym`, çizgiler `line/line2`, metin `fg/muted/dim`,
 * iletkenler `live/dead/sel`. `*Rgb` üçlüleri CSS `rgba(...)` için türetilir.
 *
 * Kural (AGENTS-UI.md): hiçbir dosyada ham hex hardcode edilmez — bu token'lar
 * kullanılır.
 */
const lightTokens = {
  // ---- Status ----
  alarm: "#c4321d",
  warn: "#a87300",
  maint: "#6f4fb3",
  cold: "#1f62c9",
  info: "#2a6db5",
  ok: "#1d8752",

  // ---- Surface ----
  bg: "#e4e8eb",
  panel: "#f3f5f6",
  panel2: "#e9edf0",
  sym: "#f3f5f6",

  // ---- Border ----
  line: "#c2cad1",
  line2: "#d5dbe0",

  // ---- Text ----
  fg: "#18212a",
  muted: "#53606b",
  dim: "#86919b",

  // ---- Conductors / selection ----
  live: "#24303b",
  dead: "#adb6be",
  sel: "#1d6fd0",

  // ---- Power flow (K-2): deşarj turuncu, şarj teal (referans paleti) ----
  discharge: "#c46d12",
  charge: "#0b8a7a",

  // ---- Chart series ----
  cSoc: "#1f6aa8",
  cPow: "#16857a",
  cSp: "#53606b",
  cHot: "#c4321d",
  cCold: "#1f62c9",

  // ---- RGB üçlüleri (diverging/sequential dolgular) ----
  hotRgb: "#ce2e1c",
  coldRgb: "#1f62c9",
  seqRgb: "#1670a8",
  midRgb: "#78848e",
} as const;

export const COLORS_LIGHT = lightTokens;

export type LightColorToken = keyof typeof lightTokens;

/** `#rrggbb` → `"r,g,b"` (CSS `rgba(var(--x-rgb), α)` için). Geçersiz → hata. */
export function hexToRgbTriple(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) {
    throw new Error(`hexToRgbTriple: gecersiz hex "${hex}"`);
  }
  const n = Number.parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export const COLOR_LIGHT: Record<LightColorToken, number> = Object.fromEntries(
  Object.entries(lightTokens).map(([k, v]) => [k, Number.parseInt(v.slice(1), 16)]),
) as Record<LightColorToken, number>;
