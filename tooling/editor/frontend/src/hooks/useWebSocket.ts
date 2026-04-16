import { useEffect, useRef } from "react";

export function useWebSocket(slug: string, onUpdate: () => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!slug) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/watch/${slug}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "file_changed" || data.type === "compose_done") {
            onUpdate();
          }
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [slug, onUpdate]);
}
