import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldsApi } from "../services/fieldsApi";
import type { AdminField, AdminFieldInput } from "../types";

export const ADMIN_FIELDS_QUERY_KEY = ["adminFields"] as const;

/** FieldPoller 30 sn'de bir özet tazelediğinden UI da 30 sn'de bir çeker. */
const REFETCH_INTERVAL_MS = 30_000;

/** Tüm sahalar (sorgu — 30 sn aralıklı tazeleme). */
export const useFieldList = () =>
  useQuery({
    queryKey: ADMIN_FIELDS_QUERY_KEY,
    queryFn: async () => (await fieldsApi.list()).data,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

/** Tek saha (sorgu). */
export const useField = (id: string | undefined) =>
  useQuery({
    queryKey: [...ADMIN_FIELDS_QUERY_KEY, id],
    queryFn: () => fieldsApi.byId(id ?? ""),
    enabled: id !== undefined && id.length > 0,
  });

/** Saha kaydı (komut) — başarıda liste cache'i geçersiz kılınır. */
export const useCreateField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminFieldInput) => fieldsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_FIELDS_QUERY_KEY });
    },
  });
};

/** Saha güncelleme (komut). */
export const useUpdateField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AdminFieldInput> }) =>
      fieldsApi.update(id, input),
    onSuccess: (updated: AdminField) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_FIELDS_QUERY_KEY });
      void queryClient.setQueryData(
        [...ADMIN_FIELDS_QUERY_KEY, updated.id],
        updated,
      );
    },
  });
};

/** Saha silme (komut). */
export const useDeleteField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fieldsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_FIELDS_QUERY_KEY });
    },
  });
};
