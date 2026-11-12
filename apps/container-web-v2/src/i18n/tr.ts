export const APP_TR_DICT = {
  "nav.dashboard": "Dashboard",
  "nav.info": "Info",
  "nav.drawer": "Drawer",
  "theme.toggle": "Tema değiştir",
} as const;

export type AppTranslationKey = keyof typeof APP_TR_DICT;

export const t = (key: AppTranslationKey): string => APP_TR_DICT[key];
