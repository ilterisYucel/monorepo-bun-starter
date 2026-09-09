import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../services/notificationsApi";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

/** Client-side "son görülme" — tek rol (patron); okundu durumu yerel. */
export const NOTIFICATIONS_SEEN_KEY = "boss-notifications-seen";

const REFETCH_INTERVAL_MS = 15_000;

/** Son görülme zamanını okur (sorgu yardımcısı — localStorage). */
export const readLastSeen = (): string => {
  try {
    const value = localStorage.getItem(NOTIFICATIONS_SEEN_KEY);
    if (value) return value;
  } catch {
    // storage erişilemez — boş
  }
  return new Date(0).toISOString();
};

/** Son görülmeyi ŞİMDİye taşır (komut — sayfa açılınca çağrılır). */
export const touchLastSeen = (): string => {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(NOTIFICATIONS_SEEN_KEY, now);
  } catch {
    // storage erişilemez — rozet yalnızca oturum içinde çalışır
  }
  return now;
};

/** Bildirim listesi (sorgu — 15 sn tazeleme; 200'e kadar, filtre client-side). */
export const useNotifications = () =>
  useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.list(200),
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 1,
  });

/** Son görülmeden bu yana okunmamış sayısı (sorgu — nav rozeti). */
export const useUnreadCount = (since: string) =>
  useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, "unread", since],
    queryFn: () => notificationsApi.unreadCount(since),
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 1,
  });
