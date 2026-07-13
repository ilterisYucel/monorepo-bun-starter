import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { logsApi } from "../features/logs/services/logsApi";
import type { TimeRange, EventAnnotationsProvider } from "@gd-monorepo/ui";
import type { LogEntry } from "@gd-monorepo/shared-types";

function rangeToDates(range: TimeRange): { from: string; to: string } {
  const now = Date.now();
  let offsetMs: number;
  switch (range) {
    case "1m": offsetMs = 60 * 1000; break;
    case "1h": offsetMs = 60 * 60 * 1000; break;
    case "1d": offsetMs = 24 * 60 * 60 * 1000; break;
    case "1w": offsetMs = 7 * 24 * 60 * 60 * 1000; break;
    case "1M": offsetMs = 30 * 24 * 60 * 60 * 1000; break;
    case "3M": offsetMs = 90 * 24 * 60 * 60 * 1000; break;
    case "6M": offsetMs = 180 * 24 * 60 * 60 * 1000; break;
    case "1y": offsetMs = 365 * 24 * 60 * 60 * 1000; break;
    default: offsetMs = 60 * 60 * 1000;
  }
  return {
    from: new Date(now - offsetMs).toISOString(),
    to: new Date(now).toISOString(),
  };
}

export const ANNOTATIONS_QUERY_KEY = ["annotations"];

export function useEventAnnotations(range: TimeRange): EventAnnotationsProvider {
  const fromTo = useMemo(() => rangeToDates(range), [range]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: [...ANNOTATIONS_QUERY_KEY, range],
    queryFn: async ({ signal }) => {
      return logsApi.list({
        type: "error,warning,success,info",
        from: fromTo.from,
        to: fromTo.to,
        limit: 200,
      }, signal);
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const annotations = useMemo<LogEntry[]>(
    () => logs as LogEntry[],
    [logs],
  );

  return { annotations, isLoading };
}
