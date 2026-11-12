import type { ColorPalette } from "./tokens";

/**
 * EMS v2 tasarım token'ları — koyu tema.
 *
 * Kaynak: Figma "Dark theme" frame'i. Anahtar kümesi açık temayla 1:1 aynıdır;
 * tints koyu yüzeylerde status renklerinin düşük parlaklık karşılığıdır.
 * MAINT tint koyu temada kullanılmıyor (SPEC A-3) — türetilmiş değer.
 */
export const COLORS_DARK: ColorPalette = {
  // ---- Text ----
  textPrimary: "#E8EDF6",
  textSecondary: "#A9B2C5",
  textTertiary: "#8A94AA",
  textOnDark: "#0B0F17",
  textOnSolid: "#FFFFFF",

  // ---- Surface & lines ----
  bgPage: "#0B0F17",
  surface: "#141B27",
  border: "#263041",
  borderStrong: "#28334A",
  lineDiagram: "#97A4BC",
  inverse: "#E8EDF6",

  // ---- Status: solid / text / tint ----
  success: "#22C597",
  successText: "#3FD3A2",
  successTint: "#10332A",
  warning: "#F6841F",
  warningText: "#FFAB5E",
  warningTint: "#3B2716",
  critical: "#E5265A",
  criticalText: "#FF6F91",
  criticalTint: "#3F1624",
  criticalTintSoft: "#3F1624",
  info: "#5D75F0",
  infoText: "#93A4FF",
  infoTint: "#1F2A52",
  maint: "#A78BFA",
  maintText: "#A78BFA",
  maintTint: "#2A2340",

  // ---- Illustration (A-3: koyu tema türetilmiş) ----
  batteryInk: "#E3E8F1",
  batteryGlyph: "#A9B2C5",
  batteryValue: "#E8EDF6",
  batteryCharge: "#3FD3A2",
  diagramMuted: "#3A455C",
  diagramMutedStrong: "#97A4BC",
};
