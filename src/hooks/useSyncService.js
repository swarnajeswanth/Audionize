import { useEffect, useRef, useCallback } from "react";
import syncService from "../services/syncService";

export const useSyncService = (sessionCode, role, userName) => {
  const isConnectedRef = useRef(false);

  // Connect to sync service
  useEffect(() => {
    if (sessionCode && role && userName && !isConnectedRef.current) {
      syncService.connect(sessionCode, role, userName);
      isConnectedRef.current = true;
    }

    return () => {
      if (isConnectedRef.current) {
        syncService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [sessionCode, role, userName]);

  // Handle room-full event
  useEffect(() => {
    // Only attach if socket exists
    if (syncService.socket) {
      const handler = (data) => {
        alert(data.message); // Or use toast.error(data.message) for better UX
        // Optionally, redirect the user back to home/join page
      };
      syncService.socket.on("room-full", handler);

      // Cleanup
      return () => {
        if (syncService.socket) {
          syncService.socket.off("room-full", handler);
        }
      };
    }
  }, [sessionCode, role, userName]);

  // Set up message handlers
  const setMessageHandler = useCallback((handler) => {
    syncService.setOnMessage(handler);
  }, []);

  const setClientUpdateHandler = useCallback((handler) => {
    syncService.setOnClientUpdate(handler);
  }, []);

  const setAudioUpdateHandler = useCallback((handler) => {
    syncService.setOnAudioUpdate(handler);
  }, []);

  // Send commands
  const sendAudio = useCallback((audioBlob, fileName, fileSize) => {
    syncService.sendAudio(audioBlob, fileName, fileSize);
  }, []);

  const sendPlay = useCallback((currentTime = 0) => {
    syncService.sendPlay(currentTime);
  }, []);

  const sendPause = useCallback(() => {
    syncService.sendPause();
  }, []);

  const sendSeek = useCallback((currentTime) => {
    syncService.sendSeek(currentTime);
  }, []);

  const sendVolume = useCallback((volume) => {
    syncService.sendVolume(volume);
  }, []);

  const sendSyncAll = useCallback((currentTime) => {
    syncService.sendSyncAll(currentTime);
  }, []);

  const sendTimeUpdate = useCallback((currentTime) => {
    syncService.sendTimeUpdate(currentTime);
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return syncService.getConnectionStatus();
  }, []);

  // When user toggles mic
  const handleMicToggle = (isMuted) => {
    syncService.socket.emit("mic-status", { isMuted });
    // Optionally, update local UI state immediately
  };

  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        // Update the UI to reflect mic status for userId
        // e.g., update Redux or local state for the participant list
        // Example: dispatch(updateMicStatus({ userId: data.userId, isMuted: data.isMuted }))
      };
      syncService.socket.on("mic-status-update", handler);
      return () => {
        syncService.socket.off("mic-status-update", handler);
      };
    }
  }, []);

  useEffect(() => {
    if (syncService.socket) {
      const handler = () => {
        // Set local mic state to muted
        // Optionally, show a toast: "You have been muted by the host"
      };
      syncService.socket.on("muted", handler);
      return () => {
        syncService.socket.off("muted", handler);
      };
    }
  }, []);

  return {
    setMessageHandler,
    setClientUpdateHandler,
    setAudioUpdateHandler,
    sendAudio,
    sendPlay,
    sendPause,
    sendSeek,
    sendVolume,
    sendSyncAll,
    sendTimeUpdate,
    getConnectionStatus,
    isConnected: getConnectionStatus(),
  };
};
