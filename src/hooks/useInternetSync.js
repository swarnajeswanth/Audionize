import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useInternetSync(session, role, name, onSync) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!session || !role || !name) return;
    const socket = io(
      process.env.NEXT_PUBLIC_IO_URL || "https://aduionize-socket.onrender.com",
      { path: "/socket.io" }
    );
    socketRef.current = socket;
    socket.emit("join", { session, role, name });
    socket.on("sync", onSync);
    return () => socket.disconnect();
  }, [session, role, name, onSync]);

  const sendSync = (data) => {
    socketRef.current?.emit("sync", { ...data, session });
  };

  return { sendSync };
}
