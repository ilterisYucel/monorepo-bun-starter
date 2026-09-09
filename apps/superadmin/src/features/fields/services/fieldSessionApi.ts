import { apiClient } from "../../../lib/api-client";

export interface FieldSessionResponse {
  sessionId: string;
  expiresInSec: number;
  redirectUrl: string;
}

/**
 * FieldSessionApi — boss tier field oturum açılışı (Faz 3).
 * `POST /api/fields/:id/session` → boss tarafı `field_session` cookie'si
 * (Path=/fields/<id>/ui) kurar; iframe aynı origin'den `/fields/<id>/ui/`
 * yüklediğinde cookie otomatik taşınır.
 */
export const fieldSessionApi = {
  async open(fieldId: string): Promise<FieldSessionResponse> {
    const response = await apiClient.post<FieldSessionResponse>(
      `/fields/${fieldId}/session`,
    );
    return response.data;
  },

  async close(fieldId: string): Promise<void> {
    await apiClient.delete(`/fields/${fieldId}/session`);
  },
};
