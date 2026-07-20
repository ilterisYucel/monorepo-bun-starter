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
  bufferSize?: number;
  enabled?: boolean;
}

export function useRealtimeTelemetry(options: UseRealtimeTelemetryOptions) {
  const {
    transport,
    deviceId,
    bufferSize = 100,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const pendingBatchRef = useRef<TelemetryEntry[]>([]);
  const rafRef = useRef<number | null>(null);
  const storeRef = useRef<{ buffer: readonly TelemetryEntry[]; listeners: Set<() => void> }>({
    buffer: [],
    listeners: new Set(),
  });

  const flushBatch = useCallback(() => {
    rafRef.current = null;
    const batch = pendingBatchRef.current;
    if (batch.length === 0) return;
    pendingBatchRef.current = [];
    const store = storeRef.current;
    const updated = [...store.buffer, ...batch].slice(-bufferSize);
    store.buffer = Object.freeze(updated);
    for (const fn of store.listeners) {
      fn();
    }
  }, [bufferSize]);

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
    () => storeRef.current.buffer as TelemetryEntry[],
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
