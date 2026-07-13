import { apiClient } from "../../../lib/api-client";

export interface ProjectRecord {
  id: string;
  name: string;
  nodes: unknown;
  edges: unknown;
  created_at: string;
  updated_at: string;
}

export const projectApi = {
  list: async (): Promise<ProjectRecord[]> => {
    const res = await apiClient.get<{ projects: ProjectRecord[] }>("/projects");
    return res.data.projects ?? [];
  },

  load: async (id: string): Promise<ProjectRecord> => {
    const res = await apiClient.get<ProjectRecord>(`/projects/${id}`);
    return res.data;
  },

  save: async (
    id: string | null,
    data: { name: string; nodes: unknown; edges: unknown },
  ): Promise<{ id: string }> => {
    if (id) {
      const res = await apiClient.put<{ id: string }>(`/projects/${id}`, data);
      return res.data;
    }
    const res = await apiClient.post<{ id: string }>("/projects", data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
