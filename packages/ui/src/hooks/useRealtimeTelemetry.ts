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
  getToken?: () => string | null;
}

export function useRealtimeTelemetry(options: UseRealtimeTelemetryOptions) {
  const {
    wsUrl,
    deviceId,
    bufferSize = 100,
    enabled = true,
    getToken,
  } = options;

  const [realtimeData, setRealtimeData] = useState<TelemetryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const wasEverOpened = useRef(false);
  const wsReconnectAttempts = useRef(0);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    const currentToken = getTokenRef.current?.();
    const resolvedWsUrl = currentToken ? `${wsUrl}?token=${encodeURIComponent(currentToken)}` : wsUrl;

    try {
      const ws = new WebSocket(resolvedWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        wasEverOpened.current = true;
        wsReconnectAttempts.current = 0;
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

        if (!wasEverOpened.current) {
          setError("WebSocket connection rejected — credentials may be invalid");
          return;
        }

        wsReconnectAttempts.current += 1;
        const delay = Math.min(3000 * Math.pow(2, wsReconnectAttempts.current - 1), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        setError("WebSocket connection error — server may be unavailable or credentials invalid");
        wsRef.current = null;
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
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [connect, deviceId]);

  return {
    data: realtimeData,
    isConnected,
    error,
    reconnect: connect,
  };
}
