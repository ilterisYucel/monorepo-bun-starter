import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { WebSocketTransport, HttpPollingTransport } from "@gd-monorepo/ui";
import type { ITelemetryTransport } from "@gd-monorepo/shared-types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001/ws/telemetry";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface TransportMap {
  ws: ITelemetryTransport;
  http: ITelemetryTransport;
}

const TransportContext = createContext<TransportMap | null>(null);

export function TransportProvider({ children }: { children: React.ReactNode }) {
  const transports = useMemo<TransportMap>(() => {
    const getToken = () => localStorage.getItem("auth-token");

    return {
      ws: new WebSocketTransport(WS_URL, getToken),
      http: new HttpPollingTransport({
        endpoint: `${API_URL}/unified/telemetry/latest`,
        intervalMs: 10000,
        getToken,
      }),
    };
  }, []);

  useEffect(() => {
    return () => {
      transports.ws.disconnect();
      transports.http.disconnect();
    };
  }, [transports]);

  return (
    <TransportContext.Provider value={transports}>
      {children}
    </TransportContext.Provider>
  );
}

export function useTransport(type: "ws" | "http" = "ws"): ITelemetryTransport {
  const ctx = useContext(TransportContext);
  if (!ctx) {
    throw new Error("useTransport must be used within a TransportProvider");
  }
  return ctx[type];
}
