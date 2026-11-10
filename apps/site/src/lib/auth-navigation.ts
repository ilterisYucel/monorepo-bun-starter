/**
 * SPA navigasyon enjeksiyonu (AUTH-REFRESH 2026-09-23).
 *
 * `api-client.ts` interceptor'ı router'a DOĞRUDAN bağımlı olamaz — router
 * → routes → pages → api-client zinciri döngü üretir. Bu modül callback
 * enjeksiyonuyla döngüyü kırar: uygulama bootstrap'i (`router.tsx`) login
 * yönlendirmesini kaydeder; interceptor `navigateToLogin()` çağırır.
 *
 * Kayıtlı navigator yoksa no-op (testler / erken dönem) — FieldShell guard'ı
 * bayat oturumda zaten `/login`'e düşürür, kilitlenme üretmez.
 */
export type LoginNavigator = (path: string) => void;

let loginNavigator: LoginNavigator | undefined;

/** Login yönlendirmesini kaydeder (uygulama bootstrap'i çağırır). */
export function setLoginNavigator(navigator: LoginNavigator): void {
  loginNavigator = navigator;
}

/** SPA navigasyonu — reload YOKTUR (B4: tam sayfa yükleme bayat state'i diriltir). */
export function navigateToLogin(path = "/login"): void {
  loginNavigator?.(path);
}
