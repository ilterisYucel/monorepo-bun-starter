import { apiClient } from "../../../lib/api-client";
import type { AdminField, AdminFieldInput } from "./types";

/**
 * FieldsApi — boss saha kayıt defteri CRUD (backend: `/api/admin/fields`,
 * FieldPoller 30 sn'de bir özetleri tazeler).
 */
export const fieldsApi = {
  /** Tüm sahaları döner (sorgu). */
  list(): Promise<{ data: AdminField[] }> {
    return apiClient.get<AdminField[]>("/admin/fields");
  },

  /** Tek sahayı döner (sorgu) — bulunamazsa undefined. */
  async byId(id: string): Promise<AdminField | undefined> {
    const response = await apiClient.get<AdminField>(`/admin/fields/${id}`);
    return response.data;
  },

  /** Yeni saha kaydeder (komut) — oluşturulan satırı döner. */
  async create(input: AdminFieldInput): Promise<AdminField> {
    const response = await apiClient.post<AdminField>("/admin/fields", input);
    return response.data;
  },

  /** Sahayı günceller (komut) — güncellenmiş satırı döner. */
  async update(id: string, input: Partial<AdminFieldInput>): Promise<AdminField> {
    const response = await apiClient.put<AdminField>(`/admin/fields/${id}`, input);
    return response.data;
  },

  /** Sahayı siler (komut). */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/fields/${id}`);
  },
};
