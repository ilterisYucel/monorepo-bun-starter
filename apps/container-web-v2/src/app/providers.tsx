import type { ReactNode } from "react";
import { ThemeProvider } from "@gd-monorepo/ui-v2";
import { useThemeMode } from "../theme/ThemeModeProvider";

/** Tema modunu ui-v2 ThemeProvider'a bağlar. */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const { mode } = useThemeMode();
  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
};
