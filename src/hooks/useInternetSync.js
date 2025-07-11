import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useInternetSync(session, role, onSync) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!session || !role) return;
    const socket = io(
      process.env.NEXT_PUBLIC_IO_URL || "https://aduionize-socket.onrender.com",
      { path: "/socket.io" }
    );
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
