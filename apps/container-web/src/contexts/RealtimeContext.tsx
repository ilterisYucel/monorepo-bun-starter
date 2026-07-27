import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useRealtimeTelemetry } from "@gd-monorepo/ui";
import { useDevicesStore } from "../stores/devicesStore";
import { useTransport } from "./TransportContext";
import { API_BASE_URL } from "../lib/api-client";
import type { TelemetryEntry } from "@gd-monorepo/ui";

interface RealtimeStream {
  data: TelemetryEntry[];
  error: string | null;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeStream | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack" || d.type === "cb" || d.type === "dc-output").map((d) => d.id),
    [devices],
  );
  const deviceId = useMemo(() => bscIds.join(","), [bscIds]);

  const transport = useTransport("ws");

  const enabled = bscIds.length > 0;
  const { data, error, reconnect } = useRealtimeTelemetry({
    transport,
    deviceId,
    enabled,
  });

  useEffect(() => {
    if (!error || !error.includes("credentials")) return;

    const refreshToken = localStorage.getItem("auth-refresh-token");
    if (!refreshToken) return;

    let cancelled = false;
    fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { accessToken: string }) => {
        if (cancelled) return;
        localStorage.setItem("auth-token", data.accessToken);
        reconnect();
      })
      .catch(() => {
        /* refresh failed */
      });

    return () => {
      cancelled = true;
    };
  }, [error, reconnect]);

  const value = useMemo(() => ({ data, error, reconnect }), [data, error, reconnect]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStream(): RealtimeStream {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtimeStream must be used within a RealtimeProvider");
  }
  return ctx;
}
