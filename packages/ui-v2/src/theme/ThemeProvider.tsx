import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { Global, ThemeProvider as EmotionThemeProvider, css, useTheme } from "@emotion/react";
import { COLORS } from "../colors";
import { COLORS_DARK } from "../colors";
import type { ColorPalette } from "../colors";

export type ThemeMode = "light" | "dark";

export interface EmsTheme {
  mode: ThemeMode;
  colors: ColorPalette;
}

declare module "@emotion/react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Theme extends EmsTheme {}
}

const THEMES: Record<ThemeMode, EmsTheme> = {
  light: { mode: "light", colors: COLORS },
  dark: { mode: "dark", colors: COLORS_DARK },
};

const EmsThemeContext = createContext<EmsTheme>(THEMES.light);

export interface ThemeProviderProps {
  mode?: ThemeMode;
  children: ReactNode;
}

const toCssVars = (colors: ColorPalette): Record<string, string> => {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    vars[`--ems-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = value;
  }
  return vars;
};

/**
 * Tema sağlayıcı — token'ları Emotion theme ve CSS değişkenleri olarak yayınlar.
 * Tema seçimi app katmanına aittir (controlled `mode`).
 */
export const ThemeProvider = ({ mode = "light", children }: ThemeProviderProps) => {
  const theme = THEMES[mode];
  const globalStyles = useMemo(
    () => css({ ":root": toCssVars(theme.colors) }),
    [theme.colors],
  );

  return (
    <EmotionThemeProvider theme={theme}>
      <Global styles={globalStyles} />
      <EmsThemeContext.Provider value={theme}>{children}</EmsThemeContext.Provider>
    </EmotionThemeProvider>
  );
};

ThemeProvider.displayName = "ThemeProvider";

/** Bileşen içinden aktif temayı okuyan kanca. */
export const useEmsTheme = (): EmsTheme => {
  useTheme();
  return useContext(EmsThemeContext);
};
