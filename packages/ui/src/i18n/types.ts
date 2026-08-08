/**
 * Çeviri sistemi tip tanımları.
 *
 * Çeviri anahtarları dot-notation string'lerdir.
 * Tip güvenliği için string literal union kullanılabilir ancak
 * esneklik için temel tip `string` olarak bırakılmıştır.
 * Her proje kendi anahtar setini `as const` ile tanımlayabilir.
 */

import type { TranslationParams } from "../interfaces/translation-provider";

/**
 * Bir dilin çeviri sözlüğü.
 * Anahtar: dot-notation string ("common.online")
 * Değer: çevrilmiş metin veya parametreli şablon ("Toplam {count} kayıt")
 */
export type TranslationDict = Record<string, string>;

/**
 * Dil kodu → sözlük eşlemesi.
 * Örn: { tr: { "common.online": "Çevrimiçi" }, en: { "common.online": "Online" } }
 */
export type TranslationModule = Record<string, TranslationDict>;

/**
 * Çeviri fonksiyonu tip imzası.
 */
export type TranslateFn = (key: string, params?: TranslationParams) => string;
