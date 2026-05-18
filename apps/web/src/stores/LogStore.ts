// src/stores/LogStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  source: "system" | "command" | "rack" | "scheduler";
  message: string;
  details?: string;
}

interface LogState {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>()(
  persist(
    (set) => ({
      logs: [],

      addLog: (entry) => {
        const newLog: LogEntry = {
          ...entry,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 500), // Son 500 log tut
        }));
      },

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "log-storage",
    },
  ),
);
