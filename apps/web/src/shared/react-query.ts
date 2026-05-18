import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5 saniye
      refetchInterval: 5000, // 5 saniyede bir yenile
      retry: 1,
    },
  },
});
