/**
 * Hub opak erişiminde programatik kimlik başlıkları.
 *
 * Hub, consumer isteğinde `x-tunnel-user-*` başlıklarını görünce peer üzerinde
 * bu kullanıcı adına oturum açar; peer uygulaması isteği bu kimlikle alır.
 * Tek kaynak — kopya sabitler drift üretmesin.
 */
export const SYSTEM_USER_HEADERS = {
  "x-tunnel-user-id": "system",
  "x-tunnel-user-username": "system",
  "x-tunnel-user-role": "admin",
} as const;
