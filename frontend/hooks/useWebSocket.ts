"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { WS_URL } from "@/lib/constants";
import type { WebSocketEvent } from "@/lib/types";

type EventHandler = (event: WebSocketEvent) => void;

export function useWebSocket(onEvent: EventHandler) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        setConnected(true);
        console.log("[WS] Connected");
      };

      socket.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WebSocketEvent;
          onEventRef.current(event);
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        setConnected(false);
        console.log("[WS] Disconnected — reconnecting in 2s");
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };

      ws.current = socket;
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectTimer.current && clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { connected };
}
