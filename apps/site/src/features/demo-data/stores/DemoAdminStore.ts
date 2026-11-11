import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEMO_DEVICES,
  DEMO_MAPPING,
  type DemoAdminParams,
  type DemoCatalogKey,
  type DemoDevicePlan,
} from "@gd-monorepo/ui";
import { isTunnelMode } from "../../../lib/api-base";

/**
 * Admin istemci durumu (SPEC UC-8 / X1-X2): mapping override'ları, cihaz IP
 * planı ve site parametreleri — backend settings API'si olmadığından referans
 * gibi tarayıcıda (localStorage) tutulur; "Copy mapping JSON" ile dışa aktarılır.
 */

const defaultMapping = (): Record<string, string> =>
  Object.fromEntries(DEMO_MAPPING.map((m) => [m.key, m.register]));

const defaultParams: DemoAdminParams = {
  restH: 0.5,
  ambMode: "fixed",
  ambC: 22,
  ambSwing: 8,
  solar: true,
  qGenMaxKW: 60,
  coolKW: 80,
  genExp: 2,
};

export interface DemoAdminStore {
  mapping: Record<string, string>;
  devices: DemoDevicePlan[];
  params: DemoAdminParams;
  mapDev: DemoCatalogKey;
  prevUnit: number;
  prevBank: "A" | "B";
  setMapping: (key: string, register: string) => void;
  resetMapping: () => void;
  setDevice: (index: number, patch: Partial<DemoDevicePlan>) => void;
  setParams: (patch: Partial<DemoAdminParams>) => void;
  setMapDev: (key: DemoCatalogKey) => void;
  setPrev: (unit: number, bank: "A" | "B") => void;
}

export const useDemoAdminStore = create<DemoAdminStore>()(
  persist(
    (set) => ({
      mapping: defaultMapping(),
      devices: DEMO_DEVICES.map((d) => ({ ...d })),
      params: { ...defaultParams },
      mapDev: "bsc",
      prevUnit: 1,
      prevBank: "A",
      setMapping: (key, register) => set((s) => ({ mapping: { ...s.mapping, [key]: register } })),
      resetMapping: () => set({ mapping: defaultMapping() }),
      setDevice: (index, patch) =>
        set((s) => ({ devices: s.devices.map((d, i) => (i === index ? { ...d, ...patch } : d)) })),
      setParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
      setMapDev: (mapDev) => set({ mapDev }),
      setPrev: (prevUnit, prevBank) => set({ prevUnit, prevBank }),
    }),
    {
      name: "demo-admin-storage",
      storage: createJSONStorage(() =>
        isTunnelMode()
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
    },
  ),
);
