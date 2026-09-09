import { apiClient } from "../../../lib/api-client";
import type { WireGuardHost, WireGuardHostInput, WireGuardHostState } from "./types";

/**
 * WireGuardApi — boss tier WG yedek yol yönetimi (Faz 4).
 * PSK yalnızca yazılır; hiçbir okuma yanıtı PSK içermez.
 */
export const wireGuardApi = {
  list(): Promise<WireGuardHost[]> {
    return apiClient
      .get<WireGuardHost[]>("/admin/wireguard/")
      .then((r) => r.data);
  },

  create(input: WireGuardHostInput): Promise<WireGuardHost> {
    return apiClient
      .post<WireGuardHost>("/admin/wireguard/", input)
      .then((r) => r.data);
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`/admin/wireguard/${id}`).then(() => undefined);
  },

  connect(id: string, probeUrl?: string): Promise<WireGuardHostState> {
    return apiClient
      .post<WireGuardHostState>(`/admin/wireguard/${id}/connect`, { probeUrl })
      .then((r) => r.data);
  },

  disconnect(id: string): Promise<WireGuardHostState> {
    return apiClient
      .post<WireGuardHostState>(`/admin/wireguard/${id}/disconnect`)
      .then((r) => r.data);
  },

  status(id: string): Promise<WireGuardHostState> {
    return apiClient
      .get<WireGuardHostState>(`/admin/wireguard/${id}/status`)
      .then((r) => r.data);
  },
};
