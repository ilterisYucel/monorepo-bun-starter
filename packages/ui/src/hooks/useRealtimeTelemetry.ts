import { useEffect, useRef, useState, useCallback } from "react";

export interface TelemetryEntry {
  name: string;
  value: number | string | boolean;
  unit: string;
  timestamp: string;
  deviceId: string;
  description?: string;
  tags?: Record<string, string>;
}

interface WsMessage {
  type: string;
  deviceId: string;
  data?: TelemetryEntry[];
}

interface UseRealtimeTelemetryOptions {
  wsUrl: string;
  deviceId: string;
  bufferSize?: number;
  enabled?: boolean;
}

export function useRealtimeTelemetry(options: UseRealtimeTelemetryOptions) {
  const {
    wsUrl,
    deviceId,
    bufferSize = 100,
    enabled = true,
  } = options;

  const [realtimeData, setRealtimeData] = useState<TelemetryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);

        ws.send(
          JSON.stringify({
            type: "subscribe",
            deviceId,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "initial":
              if (Array.isArray(msg.data)) {
                setRealtimeData(msg.data);
              }
              break;
            case "subscribed":
              break;
            default:
              setRealtimeData((prev) => {
                const updated = [...prev, msg as unknown as TelemetryEntry];
                return updated.slice(-bufferSize);
              });
              break;
          }
        } catch {
          setError("Failed to parse WebSocket message");
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        ws.close();
      };
    } catch {
      setError("Failed to create WebSocket connection");
    }
  }, [wsUrl, deviceId, bufferSize, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "unsubscribe",
              deviceId,
            }),
          );
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, deviceId]);

  return {
    data: realtimeData,
    isConnected,
    error,
  };
}
