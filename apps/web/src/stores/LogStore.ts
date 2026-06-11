// apps/web/src/stores/LogStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LogEntry, LogProvider } from "@gd-monorepo/ui";



export const useLogStore = create<LogProvider>()(
  persist(
    (set) => ({
      logs: [],

      addLog: (entry) => {
        const newLog: LogEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 500),
        }));
      },

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "log-storage",
    }
  )
);