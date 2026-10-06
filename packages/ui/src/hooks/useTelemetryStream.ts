import { useEffect, useRef, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import type { ITelemetryTransport, TelemetryData } from "@gd-monorepo/shared-types";
import type { TelemetryEntry } from "./useRealtimeTelemetry";

export interface UseTelemetryStreamOptions {
  transport: ITelemetryTransport;
  deviceIds: readonly string[];
  /** İstenen telemetri isimleri (sunucu tarafı filtre; boş = tümü). */
  names?: readonly string[];
  enabled?: boolean;
  /** Cihaz başına tutulacak kayıt sayısı (default 10). */
  bufferSizePerDevice?: number;
}

interface StoreState {
  deviceBuffers: Map<string, TelemetryEntry[]>;
  snapshot: readonly TelemetryEntry[];
  listeners: Set<() => void>;
}

const DEFAULT_BUFFER_SIZE_PER_DEVICE = 10;

function buildSnapshot(deviceBuffers: Map<string, TelemetryEntry[]>): readonly TelemetryEntry[] {
  const result: TelemetryEntry[] = [];
  for (const entries of deviceBuffers.values()) {
    result.push(...entries);
  }
  return Object.freeze(result);
}

/**
 * useTelemetryStream — çok-abone gerçek-zamanlı telemetri akışı (component izolasyonu).
 *
 * Transport multipleks destekliyorsa (`addDevices`/`removeDevices`) TEK soketi
 * paylaşır; bu hook'un unmount'u diğer bileşenlerin akışını KESMEZ. Desteklemiyorsa
 * `connect({deviceId})`/`disconnect()` fallback'ine düşer.
 *
 * Buffer cihaz başına `bufferSizePerDevice` ile sınırlıdır; veri `deviceId` bazında
 * tutulur (snapshot tüm cihazları birleştirir).
 */
export function useTelemetryStream(options: UseTelemetryStreamOptions): {
  data: readonly TelemetryEntry[];
  isConnected: boolean;
  error: string | null;
} {
  const { transport, deviceIds, names, enabled = true, bufferSizePerDevice = DEFAULT_BUFFER_SIZE_PER_DEVICE } = options;
  const deviceIdKey = useMemo(() => [...deviceIds].sort().join(","), [deviceIds]);
  const namesKey = useMemo(() => (names ? [...names].sort().join(",") : ""), [names]);
  const requestedIds = useMemo(
    () => (deviceIdKey.length > 0 ? deviceIdKey.split(",") : []),
    [deviceIdKey],
  );
  const requestedRef = useRef<ReadonlySet<string>>(new Set());
  requestedRef.current = useMemo(() => new Set(requestedIds), [requestedIds]);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const pendingBatchRef = useRef<TelemetryEntry[]>([]);
  const rafRef = useRef<number | null>(null);
  const storeRef = useRef<StoreState>({
    deviceBuffers: new Map(),
    snapshot: Object.freeze([]) as readonly TelemetryEntry[],
    listeners: new Set(),
  });

  const flushBatch = useCallback(() => {
    rafRef.current = null;
    const batch = pendingBatchRef.current;
    if (batch.length === 0) return;
    pendingBatchRef.current = [];
    const store = storeRef.current;
    const allow = requestedRef.current;

    for (const entry of batch) {
      if (allow.size > 0 && !allow.has(entry.deviceId)) continue;
      let entries = store.deviceBuffers.get(entry.deviceId);
      if (!entries) {
        entries = [];
        store.deviceBuffers.set(entry.deviceId, entries);
      }
      entries.push(entry);
      if (entries.length > bufferSizePerDevice) {
        entries.splice(0, entries.length - bufferSizePerDevice);
      }
    }

    store.snapshot = buildSnapshot(store.deviceBuffers);
    for (const fn of store.listeners) fn();
  }, [bufferSizePerDevice]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const store = storeRef.current;
    store.listeners.add(onStoreChange);
    return () => {
      store.listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => storeRef.current.snapshot, []);
  const data = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    const ids = deviceIdKey.length > 0 ? deviceIdKey.split(",") : [];
    if (!enabled || ids.length === 0) return;
    cancelledRef.current = false;

    // Artık istenmeyen cihazların buffer'larını buda (snapshot/rerender şişmesini önle).
    const allow = new Set(ids);
    const store = storeRef.current;
    let pruned = false;
    for (const key of store.deviceBuffers.keys()) {
      if (!allow.has(key)) {
        store.deviceBuffers.delete(key);
        pruned = true;
      }
    }
    if (pruned) {
      store.snapshot = buildSnapshot(store.deviceBuffers);
      for (const fn of store.listeners) fn();
    }

    const unsub = transport.subscribe({
      onData(batch: TelemetryData[]) {
        if (cancelledRef.current) return;
        for (const entry of batch) pendingBatchRef.current.push(entry as TelemetryEntry);
        if (rafRef.current === null) rafRef.current = requestAnimationFrame(flushBatch);
      },
      onError(err: Error) {
        if (cancelledRef.current) return;
        setError(err.message);
      },
      onConnectionChange(state) {
        if (cancelledRef.current) return;
        setIsConnected(state === "connected");
        if (state === "error") setError("Connection error");
        else if (state === "connected") setError(null);
      },
    });

    const multiplex = typeof transport.addDevices === "function" && typeof transport.removeDevices === "function";
    const nameList = namesKey.length > 0 ? namesKey.split(",") : undefined;
    if (multiplex) {
      transport.addDevices!(ids, nameList);
      void transport.connect({ deviceId: ids.join(",") });
    } else {
      void transport.connect({ deviceId: ids.join(",") });
    }

    return () => {
      cancelledRef.current = true;
      unsub();
      if (multiplex) {
        transport.removeDevices!(ids);
      } else {
        void transport.disconnect();
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [transport, deviceIdKey, namesKey, enabled, flushBatch]);

  return { data, isConnected, error };
}
