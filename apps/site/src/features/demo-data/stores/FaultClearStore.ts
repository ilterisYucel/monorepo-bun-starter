import { create } from "zustand";
import { setClearedAlertKeys } from "../deriveAlerts";

/**
 * Operatör arıza temizleme (2026-10-15 sahibi kararı): Admin panelinden aktif
 * PMS uyarıları anında kaldırılabilir. Temizlenen uyarı, koşulu ortadan
 * kalkana kadar gizli kalır; koşul kaybolup yeniden oluşursa YENİ arıza olarak
 * tekrar görünür (budama `prune` ile). Kalıcı DEĞİL (sayfa yenilemede sıfırlanır)
 * — gerçek kayıt backend `device_alarms` + resolve audit'indedir.
 */
export interface FaultClearState {
  cleared: string[];
  clear: (keys: string[]) => void;
  /** Artık ham listede olmayan anahtarları düşürür (koşul bitti → yeniden oluşursa görünür). */
  prune: (activeKeys: string[]) => void;
  reset: () => void;
}

export const useFaultClearStore = create<FaultClearState>()((set, get) => ({
  cleared: [],
  clear: (keys) => {
    const next = Array.from(new Set([...get().cleared, ...keys]));
    setClearedAlertKeys(next);
    set({ cleared: next });
  },
  prune: (activeKeys) => {
    const active = new Set(activeKeys);
    const cur = get().cleared;
    const next = cur.filter((k) => active.has(k));
    if (next.length === cur.length) return;
    setClearedAlertKeys(next);
    set({ cleared: next });
  },
  reset: () => {
    setClearedAlertKeys([]);
    set({ cleared: [] });
  },
}));
