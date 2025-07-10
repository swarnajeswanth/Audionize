import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useInternetSync(session, role, onSync) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!session || !role) return;
    const socket = io("http://localhost:4000", { path: "/socket.io" }); // Change to public IP for real use
    socketRef.current = socket;
    socket.emit("join", { session, role });
    socket.on("sync", onSync);
    return () => socket.disconnect();
  }, [session, role, onSync]);

  const sendSync = (data) => {
    socketRef.current?.emit("sync", { ...data, session });
  };

  return { sendSync };
}
