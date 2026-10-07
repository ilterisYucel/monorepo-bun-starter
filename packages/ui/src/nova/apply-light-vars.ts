import { COLORS_LIGHT, hexToRgbTriple } from "../colors/tokensLight";

/**
 * NOVA light CSS değişkenlerini `:root`'a yazar (SPEC K4/FR-3.4).
 * Bileşenlerde ham hex YOKTUR; tüm renkler COLORS_LIGHT'tan türetilir.
 */

/** Token → CSS değişkeni eşlemesi (saf; test edilir). */
export function novaVarMap(): Record<string, string> {
  return {
    "--nm-fg": COLORS_LIGHT.fg,
    "--nm-muted": COLORS_LIGHT.muted,
    "--nm-dim": COLORS_LIGHT.dim,
    "--nm-line": COLORS_LIGHT.line,
    "--nm-line2": COLORS_LIGHT.line2,
    "--nm-panel": COLORS_LIGHT.panel,
    "--nm-panel2": COLORS_LIGHT.panel2,
    "--nm-sym": COLORS_LIGHT.sym,
    "--nm-live": COLORS_LIGHT.live,
    "--nm-dead": COLORS_LIGHT.dead,
    "--nm-sel": COLORS_LIGHT.sel,
    "--nm-flow-dis": COLORS_LIGHT.discharge,
    "--nm-flow-chg": COLORS_LIGHT.charge,
    "--nm-alarm": COLORS_LIGHT.alarm,
    "--nm-warn": COLORS_LIGHT.warn,
    "--nm-maint": COLORS_LIGHT.maint,
    "--nm-cold": COLORS_LIGHT.cold,
    "--nm-hot-rgb": hexToRgbTriple(COLORS_LIGHT.hotRgb),
    "--nm-cold-rgb": hexToRgbTriple(COLORS_LIGHT.coldRgb),
    "--nm-seq-rgb": hexToRgbTriple(COLORS_LIGHT.seqRgb),
    "--nm-mid-rgb": hexToRgbTriple(COLORS_LIGHT.midRgb),
  };
}

/** Değişkenleri verilen köke uygular (varsayılan: document.documentElement). */
export function applyNovaLightVars(root?: HTMLElement): void {
  if (typeof document === "undefined" && root === undefined) return;
  const target = root ?? document.documentElement;
  for (const [key, value] of Object.entries(novaVarMap())) {
    target.style.setProperty(key, value);
  }
}
