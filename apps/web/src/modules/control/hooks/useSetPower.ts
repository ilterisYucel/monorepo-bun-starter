// src/modules/control/hooks/useSetPower.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { controlService } from "../services/controlService";
import { RACKS_QUERY_KEY } from "../../racks/hooks/useRacks";
import { HISTORICAL_QUERY_KEY } from "../../telemetry/hooks/useHistoricalData";
import type { SetPowerParams } from "../types";

interface UseSetPowerReturn {
  mutate: (
    params: SetPowerParams,
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    },
  ) => void;
  mutateAsync: (params: SetPowerParams) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSetPower = (): UseSetPowerReturn => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ chargeStatus, powerKw, durationSeconds }: SetPowerParams) =>
      controlService.setPower(chargeStatus, powerKw, durationSeconds),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RACKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORICAL_QUERY_KEY });
    },
  });

  return {
    mutate: (params, options) => {
      mutation.mutate(params, {
        onSuccess: () => options?.onSuccess?.(),
        onError: (error) => options?.onError?.(error as Error),
      });
    },
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
  };
};
