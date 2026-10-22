import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { NovaMimicState } from "@gd-monorepo/ui";
import { isTunnelMode } from "../../../lib/api-base";

/**
 * Grup RMU (H02 kesici + toprak ayırıcı) operatör kontrolü — 2026-10-15 sahibi
 * kararı: RMU için saha telemetrisi YOK; konum operatör tarafından elle
 * açılır/kapanır (Devices › RMU & TR). Varsayılan: H02 kapalı, toprak açık.
 * Bu durum izinleri (MV path / earthing) ve uyarıları doğrudan etkiler.
 * Saha RMU sinyali eklendiğinde bu depo kaldırılıp telemetri kullanılır.
 */
export interface RmuControlState {
  /** Grup no → H02 AÇIK mı (true = açık). Kayıt yoksa kapalı. */
  h02Open: Record<number, boolean>;
  /** Grup no → toprak ayırıcı KAPALI mı (true = topraklı). */
  earthed: Record<number, boolean>;
  setH02Open: (n: number, open: boolean) => void;
  setEarthed: (n: number, on: boolean) => void;
  reset: () => void;
}

export const useRmuStore = create<RmuControlState>()(
  persist(
    (set) => ({
      h02Open: {},
      earthed: {},
      setH02Open: (n, open) => set((s) => ({ h02Open: { ...s.h02Open, [n]: open } })),
      setEarthed: (n, on) => set((s) => ({ earthed: { ...s.earthed, [n]: on } })),
      reset: () => set({ h02Open: {}, earthed: {} }),
    }),
    {
      name: "demo-rmu-control-storage",
      storage: createJSONStorage(() =>
        isTunnelMode()
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
      partialize: (s) => ({ h02Open: s.h02Open, earthed: s.earthed }),
    },
  ),
);

/** Operatör RMU konumlarını mimic state'e uygular (saf). */
export function applyRmuControl(
  state: NovaMimicState,
  h02Open: Record<number, boolean>,
  earthed: Record<number, boolean>,
): NovaMimicState {
  if (Object.keys(h02Open).length === 0 && Object.keys(earthed).length === 0) return state;
  return {
    ...state,
    units: state.units.map((u) => ({
      ...u,
      rmu: {
        ...u.rmu,
        H02: h02Open[u.n] ? "open" : "closed",
        es: earthed[u.n] === true,
      },
    })),
  };
}
