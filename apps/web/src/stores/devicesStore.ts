// apps/web/src/stores/devicesStore.ts
import { create } from "zustand";
import { devicesApi } from "../features/devices/services/devicesApi";
import type { DeviceInfo } from "../features/devices/types/device";

interface DevicesState {
  devices: DeviceInfo[];
  loaded: boolean;
  loading: boolean;
  fetch: () => Promise<void>;
  bscDevices: () => DeviceInfo[];
  hvacDevices: () => DeviceInfo[];
  totalRacks: () => number;
}

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  loaded: false,
  loading: false,

  fetch: async () => {
    const { loaded, loading } = get();
    if (loaded || loading) return;

    set({ loading: true });
    try {
      const devices = await devicesApi.list();
      set({ devices, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  bscDevices: () => get().devices.filter(d => d.type === "bsc" || d.id?.startsWith("BSC-")),

  hvacDevices: () => get().devices.filter(d => d.type === "hvac" || d.id?.startsWith("HVAC-")),

  totalRacks: () =>
    get()
      .bscDevices()
      .reduce((s, d) => s + (d.rack_count ?? 8), 0),
}));
