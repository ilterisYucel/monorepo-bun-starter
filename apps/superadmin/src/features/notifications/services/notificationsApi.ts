import { apiClient } from "../../../lib/api-client";
import type { FieldNotification } from "./types";

/**
 * NotificationsApi — boss bildirim akışı (Faz 5, §7.6).
 * `after` = client-side "son görülme" zamanı; okundu durumu sunucuda tutulmaz.
 */
export const notificationsApi = {
  list(limit = 100, after?: string): Promise<FieldNotification[]> {
    const params = after ? { limit, after } : { limit };
    return apiClient
      .get<FieldNotification[]>("/notifications/", { params })
      .then((r) => r.data);
  },

  unreadCount(since: string): Promise<number> {
    return apiClient
      .get<{ count: number }>("/notifications/unread-count", {
        params: { since },
      })
      .then((r) => r.data.count);
  },
};
