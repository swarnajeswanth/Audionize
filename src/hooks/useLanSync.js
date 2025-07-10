import { useRef, useEffect } from "react";

export function useLanSync(session, role, onSync) {
  const wsRef = useRef(null);

  useEffect(() => {
    if (!session || !role) return;
    const ws = new window.WebSocket("ws://localhost:4000/ws"); // Change to LAN IP for real use
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", session, role }));
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "sync") onSync(data);
    };
    return () => ws.close();
  }, [session, role, onSync]);

  const sendSync = (data) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "sync", ...data, session }));
    } else {
      // Optionally: queue the message or log a warning
      // console.warn("WebSocket not open, message not sent");
    }
  };

  return { sendSync };
}
