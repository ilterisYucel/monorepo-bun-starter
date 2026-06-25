// apps/web/src/stores/LogStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LogEntry, LogProvider } from "@gd-monorepo/ui";
import { logsApi } from "../features/logs/services/logsApi";

const MAX_LOGS = 500;
let _fetchedBackend = false;

type StoreState = LogProvider & { fetchBackend: () => Promise<void> };

export const useLogStore = create<StoreState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => {
        const newLog: LogEntry = {
          ...entry,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
        };

        set((state: StoreState) => ({
          logs: [newLog, ...state.logs].slice(0, MAX_LOGS),
        }));

        logsApi.create(entry).then((serverLog) => {
          set((state: StoreState) => ({
            logs: state.logs.map((l: LogEntry) =>
              l.id === newLog.id ? { ...serverLog } : l,
            ),
          }));
        }).catch(() => {
          // stays in local state — persisted to localStorage
        });
      },

      clearLogs: () => set({ logs: [] }),

      fetchBackend: async () => {
        if (_fetchedBackend) return;
        _fetchedBackend = true;
        try {
          const now = new Date().toISOString();
          const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const backendLogs = await logsApi.list({
            from,
            to: now,
            limit: 200,
            source: "system,user",
          });
          if (backendLogs.length === 0) return;

          set((state: StoreState) => {
            const localOnly = state.logs.filter(
              (l: LogEntry) =>
                l.id.startsWith("local-") &&
                !backendLogs.some(
                  (bl: LogEntry) =>
                    bl.message === l.message &&
                    Math.abs(
                      new Date(bl.timestamp).getTime() -
                        new Date(l.timestamp).getTime(),
                    ) < 5000,
                ),
            );
            return {
              logs: [...localOnly, ...backendLogs]
                .sort(
                  (a: LogEntry, b: LogEntry) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
                )
                .slice(0, MAX_LOGS),
            };
          });
        } catch {
          // backend unavailable — use local logs only
        }
      },
    }),
    { name: "log-storage" },
  ),
);
