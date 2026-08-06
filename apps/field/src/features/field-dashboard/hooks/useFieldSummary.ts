import { useQuery } from "@tanstack/react-query";
import { fieldApi } from "../services/fieldApi";

export function useFieldSummary(fieldId: string) {
  return useQuery({
    queryKey: ["field", "summary", fieldId],
    queryFn: () => fieldApi.summary(fieldId),
    enabled: !!fieldId,
    refetchInterval: 30000,
  });
}
