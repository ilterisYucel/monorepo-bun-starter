import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export const racksKeys = {
  all: ["racks"] as const,
  lists: () => [...racksKeys.all, "list"] as const,
  list: () => [...racksKeys.lists()] as const,
  details: () => [...racksKeys.all, "detail"] as const,
  detail: (id: number) => [...racksKeys.details(), id] as const,
};

// Rack'leri getir
export const useRacks = () => {
  return useQuery({
    queryKey: racksKeys.list(),
    queryFn: () => api.getRacks(),
    staleTime: 5000,
    refetchInterval: 5000,
  });
};

// Status güncelleme mutation
export const useSetStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      status,
      rackId,
    }: {
      status: "online" | "offline";
      rackId?: number;
    }) => api.setStatus(status, rackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: racksKeys.lists() });
    },
  });
};

// SoC güncelleme mutation
export const useSetSoc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ soc, rackId }: { soc: number; rackId?: number }) =>
      api.setSoc(soc, rackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: racksKeys.lists() });
    },
  });
};

// Power komutu mutation
export const useSetPower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chargeStatus,
      powerKw,
      durationSeconds,
      rackId,
    }: {
      chargeStatus: "Charge" | "Discharge" | "Idle";
      powerKw: number;
      durationSeconds: number;
      rackId?: number;
    }) => api.setPower(chargeStatus, powerKw, durationSeconds, rackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: racksKeys.lists() });
    },
  });
};
