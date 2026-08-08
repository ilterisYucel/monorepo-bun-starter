import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { User, CreateUserRequest } from "@gd-monorepo/shared-types";

export function useUserList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get<User[]>("/auth/users");
      return response.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await apiClient.post<User>("/auth/users", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/auth/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
