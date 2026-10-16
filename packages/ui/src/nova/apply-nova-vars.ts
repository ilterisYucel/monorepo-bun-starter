import { COLORS_LIGHT, hexToRgbTriple, type LightColorToken } from "../colors/tokensLight";
import { COLORS_DARK } from "../colors/tokensDark";

/**
 * NOVA tema sürücüsü (SPEC K-2): light/dark token'larını aynı `--nm-*` CSS
 * değişkenlerine yazar. Bileşenlerde ham hex YOKTUR; tüm tema renkleri buradan
 * türetilir ve tema değişince değişkenler yeniden yazılır.
 */

export type NovaTheme = "light" | "dark";

const THEME_TOKENS: Record<NovaTheme, typeof COLORS_LIGHT> = {
  light: COLORS_LIGHT,
  dark: COLORS_DARK as unknown as typeof COLORS_LIGHT,
};

/** Tema token'ları → CSS değişkeni eşlemesi (saf; test edilir). */
export function novaVarMap(theme: NovaTheme = "light"): Record<string, string> {
  const t = THEME_TOKENS[theme];
  return {
    "--nm-bg": t.bg,
    "--nm-fg": t.fg,
    "--nm-muted": t.muted,
    "--nm-dim": t.dim,
    "--nm-line": t.line,
    "--nm-line2": t.line2,
    "--nm-panel": t.panel,
    "--nm-panel2": t.panel2,
    "--nm-sym": t.sym,
    "--nm-live": t.live,
    "--nm-dead": t.dead,
    "--nm-sel": t.sel,
    "--nm-flow-dis": t.discharge,
    "--nm-flow-chg": t.charge,
    "--nm-alarm": t.alarm,
    "--nm-warn": t.warn,
    "--nm-maint": t.maint,
    "--nm-cold": t.cold,
    "--nm-info": t.info,
    "--nm-ok": t.ok,
    "--nm-c-soc": t.cSoc,
    "--nm-c-pow": t.cPow,
    "--nm-c-sp": t.cSp,
    "--nm-c-hot": t.cHot,
    "--nm-c-cold": t.cCold,
    "--nm-hot-rgb": hexToRgbTriple(t.hotRgb),
    "--nm-cold-rgb": hexToRgbTriple(t.coldRgb),
    "--nm-seq-rgb": hexToRgbTriple(t.seqRgb),
    "--nm-mid-rgb": hexToRgbTriple(t.midRgb),
  };
}

/**
 * Tema değişkenlerini verilen köke uygular (varsayılan: document.documentElement).
 * Ayrıca `data-theme` niteliğini set eder ki CSS `[data-theme="dark"]` kuralları
 * (ör. logo, color-scheme) devreye girsin.
 */
export function applyNovaVars(theme: NovaTheme, root?: HTMLElement): void {
  if (typeof document === "undefined" && root === undefined) return;
  const target = root ?? document.documentElement;
  for (const [key, value] of Object.entries(novaVarMap(theme))) {
    target.style.setProperty(key, value);
  }
  if (root === undefined) {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/** Geriye dönük uyum: yalnız light değişkenlerini uygular. */
export function applyNovaLightVars(root?: HTMLElement): void {
  applyNovaVars("light", root);
}

export type { LightColorToken };
