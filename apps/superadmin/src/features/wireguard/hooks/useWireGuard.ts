import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wireGuardApi } from "../services/wireguardApi";
import type { WireGuardHostInput } from "../types";

export const WIREGUARD_QUERY_KEY = ["wireguard"] as const;

const REFETCH_INTERVAL_MS = 15_000;

/** WG host listesi + durumları (sorgu — 15 sn tazeleme). */
export const useWireGuardHosts = () =>
  useQuery({
    queryKey: WIREGUARD_QUERY_KEY,
    queryFn: async () => {
      const hosts = await wireGuardApi.list();
      const states = await Promise.allSettled(
        hosts.map((host) => wireGuardApi.status(host.id)),
      );
      return hosts.map((host, index) => {
        const result = states[index];
        const state =
          result?.status === "fulfilled" ? result.value.state : "down";
        return { host, state };
      });
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 1,
  });

/** Host kaydı (komut). */
export const useCreateWgHost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WireGuardHostInput) => wireGuardApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WIREGUARD_QUERY_KEY });
    },
  });
};

/** Bağlan (komut) — durum sorgusunu tazeler. */
export const useWgConnect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, probeUrl }: { id: string; probeUrl?: string }) =>
      wireGuardApi.connect(id, probeUrl),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WIREGUARD_QUERY_KEY });
    },
  });
};

/** Bağlantıyı düşür (komut). */
export const useWgDisconnect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wireGuardApi.disconnect(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WIREGUARD_QUERY_KEY });
    },
  });
};

/** Host sil (komut). */
export const useWgRemove = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wireGuardApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WIREGUARD_QUERY_KEY });
    },
  });
};
