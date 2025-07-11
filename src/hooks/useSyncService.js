import React, {
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import syncService from "../services/syncService";
import toast from "react-hot-toast";
import { useAppDispatch } from "../store/hooks";
import { setAudioUrl, setAudioFile } from "../store/slices/audioSlice";
import {
  clearSync,
  setConnected,
  setSyncStatus,
} from "../store/slices/syncSlice";
import { clearSession } from "../store/slices/sessionSlice";

export const useSyncService = (
  sessionCode,
  role,
  userName,
  onHostDisconnect = null
) => {
  const isConnectedRef = React.useRef(false);
  const dispatch = useAppDispatch();

  // Connect to sync service
  useEffect(() => {
    if (sessionCode && role && userName && !isConnectedRef.current) {
      try {
        console.log("Connecting to sync service:", {
          sessionCode,
          role,
          userName,
        });
        syncService.connect(sessionCode, role, userName);
        isConnectedRef.current = true;
      } catch (error) {
        console.error("Failed to connect to sync service:", error);
        toast.error("Failed to connect to sync service");
      }
    }

    return () => {
      if (isConnectedRef.current) {
        console.log("Disconnecting from sync service");
        syncService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [sessionCode, role, userName]);

  // Handle room-full event - always call useEffect
  useEffect(() => {
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
    // Return empty cleanup function if no socket
    return () => {};
  }, [sessionCode, role, userName]);

  // Handle host disconnection - always call useEffect
  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        console.log("Host disconnected:", data);

        // Call the optional callback if provided
        if (onHostDisconnect) {
          onHostDisconnect(data);
        }

        // Clear all sync and session state
        dispatch(clearSync());
        dispatch(clearSession());

        // Clear audio state
        dispatch(setAudioUrl(null));
        dispatch(setAudioFile(null));

        // Set connection status to disconnected
        dispatch(setConnected(false));
        dispatch(setSyncStatus("disconnected"));

        // Clear localStorage
        if (sessionCode) {
          localStorage.removeItem(`audionize_client_session_${sessionCode}`);
          localStorage.removeItem(`audionize_user_${sessionCode}`);
          localStorage.removeItem("audionize_host_session");
        }

        // Show notification
        toast.error("Host has disconnected. Session ended.");

        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      };

      syncService.socket.on("host_disconnect", handler);

      // Cleanup
      return () => {
        if (syncService.socket) {
          syncService.socket.off("host_disconnect", handler);
        }
      };
    }
    // Return empty cleanup function if no socket
    return () => {};
  }, [sessionCode, role, userName, dispatch, onHostDisconnect]);

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
  const sendAudio = useCallback((audioBuffer, fileName, fileSize, fileType) => {
    syncService.sendAudio(audioBuffer, fileName, fileSize, fileType);
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
    if (syncService.socket) {
      syncService.socket.emit("mic-status", { isMuted });
      // Optionally, update local UI state immediately
    }
  };

  // Handle mic status updates - always call useEffect
  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        // Update the UI to reflect mic status for userId
        // e.g., update Redux or local state for the participant list
        // Example: dispatch(updateMicStatus({ userId: data.userId, isMuted: data.isMuted }))
      };
      syncService.socket.on("mic-status-update", handler);
      return () => {
        if (syncService.socket) {
          syncService.socket.off("mic-status-update", handler);
        }
      };
    }
    // Return empty cleanup function if no socket
    return () => {};
  }, []);

  // Handle muted event - always call useEffect
  useEffect(() => {
    if (syncService.socket) {
      const handler = () => {
        // Set local mic state to muted
        // Optionally, show a toast: "You have been muted by the host"
      };
      syncService.socket.on("muted", handler);
      return () => {
        if (syncService.socket) {
          syncService.socket.off("muted", handler);
        }
      };
    }
    // Return empty cleanup function if no socket
    return () => {};
  }, []);

  // Handle audio sync from server - always call useEffect
  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        console.log("Received audio_sync:", data);
        try {
          // Handle audio blob data
          if (data.audioBuffer) {
            // Use the correct type if provided, fallback to "audio/mpeg"
            const audioBlob = new Blob([new Uint8Array(data.audioBuffer)], {
              type: data.fileType || "audio/mpeg",
            });
            const url = URL.createObjectURL(audioBlob);
            dispatch(setAudioUrl(url));
            dispatch(setAudioFile(audioBlob));
            toast.success("New audio received from host");
          }
          // Handle audio URL data
          else if (data.audioUrl) {
            dispatch(setAudioUrl(data.audioUrl));
            toast.success("New audio received from host");
          }
        } catch (error) {
          console.error("Error processing audio sync:", error);
          toast.error("Failed to load audio from host");
        }
      };
      syncService.socket.on("audio_sync", handler);
      return () => {
        if (syncService.socket) {
          syncService.socket.off("audio_sync", handler);
        }
      };
    }
    // Return empty cleanup function if no socket
    return () => {};
  }, [dispatch]);

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
