import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isTunnelMode } from "../../../lib/api-base";

/**
 * Hedef SOC deposu (SPEC UC-5) — backend hedef SOC'yi desteklemediğinden
 * frontend'de tutulur; `useTargetSocWatcher` SOC hedefe ulaşınca standby çalıştırır.
 */

export interface TargetSocState {
  target: number | null;
  dir: "chg" | "dis" | null;
  scope: number[];
  active: boolean;
  /** Hedefin ayarlandığı an (ms) — watcher yalnız bu andan sonra başlayan run'ı sayar. */
  setAt: number;
  /** UC-13: hedefin ait olduğu istasyon key'i (bess1/bess2) — stop doğru konteynere gider. */
  stationKey: string | undefined;
  setTarget: (target: number, dir: "chg" | "dis", scope: number[], stationKey?: string) => void;
  clear: () => void;
}

export const useTargetSocStore = create<TargetSocState>()(
  persist(
    (set) => ({
      target: null,
      dir: null,
      scope: [],
      active: false,
      setAt: 0,
      stationKey: undefined,
      setTarget: (target, dir, scope, stationKey) =>
        set({ target, dir, scope, active: true, setAt: Date.now(), stationKey }),
      clear: () => set({ target: null, dir: null, scope: [], active: false, setAt: 0, stationKey: undefined }),
    }),
    {
      name: "demo-target-soc-storage",
      storage: createJSONStorage(() =>
        isTunnelMode()
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
    },
  ),
);
