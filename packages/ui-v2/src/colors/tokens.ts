/**
 * EMS v2 tasarım token'ları — açık tema.
 *
 * Kaynak: Figma "GD-EMS · Design system guide" (docs/gd-ems_..._20261106-111521).
 * Renkler yalnız burada tanımlanır; bileşenlerde hardcoded hex YASAK.
 */
const tokens = {
  // ---- Text ----
  textPrimary: "#10151C",
  textSecondary: "#5F6A82",
  textTertiary: "#8A93A8",
  textOnDark: "#FFFFFF",
  textOnSolid: "#FFFFFF",

  // ---- Surface & lines ----
  bgPage: "#F4F7FC",
  surface: "#FFFFFF",
  border: "#E4E9F4",
  borderStrong: "#B9C1D3",
  lineDiagram: "#2F3A4F",
  inverse: "#10151C",

  // ---- Status: solid / text / tint ----
  success: "#17B589",
  successText: "#0B7A5A",
  successTint: "#E8F6F1",
  warning: "#F57818",
  warningText: "#A85200",
  warningTint: "#FDEEDF",
  critical: "#E11D53",
  criticalText: "#E11D53",
  criticalTint: "#FCE7ED",
  criticalTintSoft: "#FDEBEE",
  info: "#455DDC",
  infoText: "#455DDC",
  infoTint: "#E8EBFB",
  maint: "#7C3AED",
  maintText: "#7C3AED",
  maintTint: "#F0E9FD",

  // ---- Illustration (BESS mikro-çizimleri, şema) ----
  batteryInk: "#1B1A1A",
  batteryGlyph: "#404040",
  batteryValue: "#313131",
  batteryCharge: "#118061",
  diagramMuted: "#C7CCD7",
  diagramMutedStrong: "#9AA6B4",
} as const;

export type ColorToken = keyof typeof tokens;
export type ColorPalette = Record<ColorToken, string>;

export const COLORS: ColorPalette = tokens;
