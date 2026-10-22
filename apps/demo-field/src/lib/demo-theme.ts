import { useCallback, useEffect, useState } from "react";
import { applyNovaVars, type NovaTheme } from "@gd-monorepo/ui";

/**
 * Demo tema sürücüsü (SPEC UC-1, K-2): light/dark referans paleti.
 * Sıra: localStorage → `prefers-color-scheme` → light. `applyNovaVars` hem
 * `--nm-*` değişkenlerini hem `data-theme` niteliğini yazar.
 */

const KEY = "gdpms.theme";

export function initialTheme(): NovaTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // localStorage erişilemez — fallback
  }
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function useDemoTheme(): [NovaTheme, (t: NovaTheme) => void] {
  // İlk render'da senkron uygula: tema sürücüsü yalnızca bu hook. Alt
  // bileşenlerin (ör. DemoMimic) mount efektleri ebeveynden ÖNCE koştuğu için,
  // değişkenler effect'e bırakılırsa ilk boyamada eksik kalır.
  const [theme, setThemeState] = useState<NovaTheme>(() => {
    const t = initialTheme();
    applyNovaVars(t);
    return t;
  });

  useEffect(() => {
    applyNovaVars(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // sessiz
    }
  }, [theme]);

  const setTheme = useCallback((t: NovaTheme) => setThemeState(t), []);
  return [theme, setTheme];
}
