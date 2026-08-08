import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import type { ITelemetryTransport, TelemetryData } from "@gd-monorepo/shared-types";

export interface TelemetryEntry {
  name: string;
  value: number | string | boolean;
  unit: string;
  timestamp: string;
  deviceId: string;
  description?: string;
  tags?: Record<string, string>;
}

export interface UseRealtimeTelemetryOptions {
  transport: ITelemetryTransport;
  deviceId: string;
  enabled?: boolean;
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

export function useRealtimeTelemetry(options: UseRealtimeTelemetryOptions) {
  const {
    transport,
    deviceId,
    enabled = true,
  } = options;

  const bufferSizePerDevice = DEFAULT_BUFFER_SIZE_PER_DEVICE;

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

    for (const entry of batch) {
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

    for (const fn of store.listeners) {
      fn();
    }
  }, [bufferSizePerDevice]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const store = storeRef.current;
      store.listeners.add(onStoreChange);
      return () => {
        store.listeners.delete(onStoreChange);
      };
    },
    [],
  );

  const getSnapshot = useCallback(
    () => storeRef.current.snapshot,
    [],
  );

  const realtimeData = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;

    const unsub = transport.subscribe({
      onData(batch: TelemetryData[]) {
        if (cancelledRef.current) return;
        for (const entry of batch) {
          pendingBatchRef.current.push(entry as TelemetryEntry);
        }
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushBatch);
        }
      },
      onError(err: Error) {
        if (cancelledRef.current) return;
        setError(err.message);
      },
      onConnectionChange(state) {
        if (cancelledRef.current) return;
        setIsConnected(state === "connected");
        if (state === "error") {
          setError("Connection error");
        } else if (state === "connected") {
          setError(null);
        }
      },
    });

    transport.connect({ deviceId });

    return () => {
      cancelledRef.current = true;
      unsub();
      transport.disconnect();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [transport, deviceId, enabled, flushBatch]);

  const reconnect = useCallback(() => {
    transport.disconnect().then(() => {
      transport.connect({ deviceId });
    });
  }, [transport, deviceId]);

  return {
    data: realtimeData,
    isConnected,
    error,
    reconnect,
  };
}
