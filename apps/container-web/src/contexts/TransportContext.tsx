import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { WebSocketTransport, HttpPollingTransport } from "@gd-monorepo/ui";
import type { ITelemetryTransport } from "@gd-monorepo/shared-types";
import { apiBaseUrl, wsUrl } from "../lib/api-base";

// Faz 4 T4.3: build-time WS/API gömme kaldırıldı — adresler window.location'dan
// türetilir (tünel modunda Path-scoped cookie ile otomatik taşınır).
const WS_URL = wsUrl();
const API_URL = apiBaseUrl();

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
