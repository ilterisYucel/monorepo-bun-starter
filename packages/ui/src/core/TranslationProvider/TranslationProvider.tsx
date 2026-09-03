/**
 * TranslationProvider — React Context tabanlı çeviri sağlayıcı.
 *
 * ITranslationProvider arayüzünün React implementasyonudur.
 * Bileşen ağacında bir kez, en üst seviyede sarmalanır.
 *
 * Tasarım prensipleri:
 *   - Sözlükler dışarıdan props ile alınır (IoC)
 *   - Context değeri sabit referanslıdır (gereksiz render önlenir)
 *   - setLocale asenkron olabilir (dinamik dil yüklemesi)
 *   - Anahtar bulunamazsa fallback olarak anahtarın kendisi döndürülür
 *
 * @example
 * // Uygulama kökünde:
 * <TranslationProvider
 *   dictionaries={{ tr: TR_DICT, en: EN_DICT }}
 *   defaultLocale="tr"
 * >
 *   <App />
 * </TranslationProvider>
 *
 * // Bileşen içinde:
 * const { t, locale, setLocale } = useTranslation();
 * <label>{t("device.voltage")}</label>
 * <span>{t("log.total", { count: 42 })}</span>
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import type { TranslationDict, TranslateFn } from "../../i18n/types";
import type { ITranslationProvider, TranslationParams } from "../../interfaces/translation-provider";

// =============================================================================
// Tipler
// =============================================================================

interface TranslationProviderProps {
  /** Dil kodu → sözlük eşlemesi. En az bir dil içermelidir. */
  dictionaries: Record<string, TranslationDict>;
  /** Başlangıç yerel ayarı. dictionaries içinde bulunmalıdır. */
  defaultLocale: string;
  /** Uygulama katmanından gelen ek çeviri anahtarları (dil kodu → ek sözlük). UI sözlüğünü override eder. */
  extraKeys?: Record<string, TranslationDict>;
  children: React.ReactNode;
}

interface TranslationContextValue extends ITranslationProvider {
  /** Ham sözlük erişimi (özel durumlar için, normalde t() kullanın) */
  readonly dict: TranslationDict;
}

// =============================================================================
// Context
// =============================================================================

const TranslationCtx = createContext<TranslationContextValue | null>(null);
TranslationCtx.displayName = "TranslationContext";

// =============================================================================
// Yardımcı: parametreli şablon değiştirme
// =============================================================================

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

// =============================================================================
// Provider Bileşeni
// =============================================================================

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  dictionaries,
  defaultLocale,
  extraKeys,
  children,
}) => {
  const [locale, setLocaleState] = useState(defaultLocale);
  const baseDict = dictionaries[locale] ?? dictionaries[defaultLocale] ?? {};
  const extraDict = extraKeys?.[locale] ?? {};
  const dict: TranslationDict = useMemo(
    () => ({ ...baseDict, ...extraDict }),
    [baseDict, extraDict],
  );

  const availableLocales = useMemo(
    () => Object.freeze(Object.keys(dictionaries)),
    [dictionaries],
  ) as readonly string[];

  const t: TranslateFn = useCallback(
    (key: string, params?: TranslationParams): string => {
      const template = dict[key] ?? key;
      return interpolate(template, params);
    },
    [dict],
  );

  const localeGetter = useCallback((): string => locale, [locale]);

  const setLocale = useCallback(
    async (newLocale: string): Promise<void> => {
      if (!dictionaries[newLocale]) {
        console.warn(
          `[TranslationProvider] "${newLocale}" dili bulunamadı. Mevcut: ${availableLocales.join(", ")}`,
        );
        return;
      }
      setLocaleState(newLocale);
    },
    [dictionaries, availableLocales],
  );

  const contextValue: TranslationContextValue = useMemo(
    () => ({
      dict,
      t,
      locale: localeGetter,
      setLocale,
      // 2026-08-30 (T4): ITranslationProvider kontratı availableLocales'i
      // FONKSİYON olarak tanımlar — implementasyon dizi sunuyordu (tip borcu).
      availableLocales: () => availableLocales,
    }),
    [dict, t, localeGetter, setLocale, availableLocales],
  );

  return (
    <TranslationCtx.Provider value={contextValue}>
      {children}
    </TranslationCtx.Provider>
  );
};

TranslationProvider.displayName = "TranslationProvider";

// =============================================================================
// useTranslation Hook
// =============================================================================

/**
 * Çeviri sistemine erişim hook'u.
 *
 * Bir TranslationProvider altındaki herhangi bir bileşenden çağrılabilir.
 * Provider yoksa hata fırlatır.
 *
 * @returns { t, locale, setLocale, dict, availableLocales }
 */
export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationCtx);
  if (!ctx) {
    throw new Error(
      "useTranslation() bir <TranslationProvider> içinde çağrılmalıdır.",
    );
  }
  return ctx;
}
