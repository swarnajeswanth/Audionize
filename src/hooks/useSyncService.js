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
  onHostDisconnect = null,
  syncConfig = {}
) => {
  const isConnectedRef = React.useRef(false);
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] =
    React.useState("disconnected");

  // Default sync configuration (memoized)
  const defaultConfig = React.useMemo(
    () => ({
      syncTolerance: 100, // milliseconds
      playDelay: 1000, // milliseconds
      driftCorrectionThreshold: 0.1, // seconds
      pingInterval: 5000, // milliseconds
      maxLatency: 500, // milliseconds
      ...syncConfig,
    }),
    [syncConfig]
  );

  // Track previous values to avoid unnecessary disconnect/reconnect
  const prevSessionCode = React.useRef();
  const prevRole = React.useRef();
  const prevUserName = React.useRef();

  useEffect(() => {
    // Only connect if values actually changed
    const shouldConnect =
      sessionCode &&
      role &&
      userName &&
      (sessionCode !== prevSessionCode.current ||
        role !== prevRole.current ||
        userName !== prevUserName.current);

    let didConnect = false;
    let reconnectTimeout = null;

    if (shouldConnect && !isConnectedRef.current) {
      const connectToServer = async () => {
        try {
          console.log("Connecting to sync service:", {
            sessionCode,
            role,
            userName,
            config: defaultConfig,
          });

          setConnectionStatus("connecting");

          // Apply sync configuration
          syncService.syncTolerance = defaultConfig.syncTolerance;
          syncService.pingInterval = defaultConfig.pingInterval;

          await syncService.connect(sessionCode, role, userName);
          isConnectedRef.current = true;
          setConnectionStatus("connected");

          // Update Redux state
          dispatch(setConnected(true));
          dispatch(setSyncStatus("connected"));

          console.log("Successfully connected to sync service");
          didConnect = true;
        } catch (error) {
          console.error("Failed to connect to sync service:", error);
          setConnectionStatus("error");
          dispatch(setConnected(false));
          dispatch(setSyncStatus("error"));
          toast.error("Failed to connect to sync service");

          // Set up reconnection attempt
          if (sessionCode && role && userName) {
            reconnectTimeout = setTimeout(() => {
              console.log("Attempting to reconnect to sync service...");
              isConnectedRef.current = false; // Reset connection state
              connectToServer(); // Retry connection
            }, 5000); // Wait 5 seconds before reconnecting
          }
        }
      };
      connectToServer();
    }

    // Update refs after attempting connection
    prevSessionCode.current = sessionCode;
    prevRole.current = role;
    prevUserName.current = userName;

    // Only disconnect on true unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (isConnectedRef.current) {
        console.log("Disconnecting from sync service");
        syncService.disconnect();
        isConnectedRef.current = false;
        setConnectionStatus("disconnected");
        dispatch(setConnected(false));
        dispatch(setSyncStatus("disconnected"));
      }
    };
  }, [sessionCode, role, userName, dispatch]);

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
  }, []);

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
  }, [sessionCode, dispatch, onHostDisconnect]);

  // Monitor connection status and handle reconnection
  useEffect(() => {
    if (syncService.socket) {
      const handleDisconnect = (reason) => {
        console.log("Socket disconnected:", reason);
        isConnectedRef.current = false;
        setConnectionStatus("disconnected");
        dispatch(setConnected(false));
        dispatch(setSyncStatus("disconnected"));

        // Only attempt reconnection if we have valid session data and it's not a manual disconnect
        if (
          sessionCode &&
          role &&
          userName &&
          reason !== "io client disconnect"
        ) {
          console.log("Attempting to reconnect after disconnect...");
          setTimeout(() => {
            if (sessionCode && role && userName) {
              isConnectedRef.current = false; // Reset connection state
              // The main useEffect will handle reconnection
            }
          }, 3000); // Wait 3 seconds before attempting reconnection
        }
      };

      const handleReconnect = (attemptNumber) => {
        console.log("Socket reconnected on attempt:", attemptNumber);
        isConnectedRef.current = true;
        setConnectionStatus("connected");
        dispatch(setConnected(true));
        dispatch(setSyncStatus("connected"));
        toast.success("Reconnected to session!");
      };

      const handleReconnectError = (error) => {
        console.error("Socket reconnection failed:", error);
        setConnectionStatus("error");
        dispatch(setConnected(false));
        dispatch(setSyncStatus("error"));
      };

      syncService.socket.on("disconnect", handleDisconnect);
      syncService.socket.on("reconnect", handleReconnect);
      syncService.socket.on("reconnect_error", handleReconnectError);

      // Cleanup
      return () => {
        if (syncService.socket) {
          syncService.socket.off("disconnect", handleDisconnect);
          syncService.socket.off("reconnect", handleReconnect);
          syncService.socket.off("reconnect_error", handleReconnectError);
        }
      };
    }
    return () => {};
  }, [sessionCode, role, userName, dispatch]);

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

  // Send commands with connection check
  const sendAudio = useCallback(
    (audioBuffer, fileName, fileSize, fileType) => {
      if (connectionStatus === "connected") {
        syncService.sendAudio(audioBuffer, fileName, fileSize, fileType);
      } else {
        console.log("Queueing audio send - waiting for connection...");
        syncService.sendAudio(audioBuffer, fileName, fileSize, fileType);
      }
    },
    [connectionStatus]
  );

  const sendPlay = useCallback(
    (scheduledTime = 0, currentTime = 0) => {
      if (connectionStatus === "connected") {
        syncService.sendPlay(scheduledTime, currentTime);
      } else {
        console.log("Queueing play command - waiting for connection...");
        syncService.sendPlay(scheduledTime, currentTime);
      }
    },
    [connectionStatus]
  );

  const sendPause = useCallback(
    (currentTime = 0) => {
      if (connectionStatus === "connected") {
        syncService.sendPause(currentTime);
      } else {
        console.log("Queueing pause command - waiting for connection...");
        syncService.sendPause(currentTime);
      }
    },
    [connectionStatus]
  );

  const sendSeek = useCallback(
    (currentTime) => {
      if (connectionStatus === "connected") {
        syncService.sendSeek(currentTime);
      } else {
        console.log("Queueing seek command - waiting for connection...");
        syncService.sendSeek(currentTime);
      }
    },
    [connectionStatus]
  );

  const sendVolume = useCallback(
    (volume) => {
      if (connectionStatus === "connected") {
        syncService.sendVolume(volume);
      } else {
        console.log("Queueing volume command - waiting for connection...");
        syncService.sendVolume(volume);
      }
    },
    [connectionStatus]
  );

  const sendSyncAll = useCallback(
    (currentTime) => {
      if (connectionStatus === "connected") {
        syncService.sendSyncAll(currentTime);
      } else {
        console.log("Queueing sync all command - waiting for connection...");
        syncService.sendSyncAll(currentTime);
      }
    },
    [connectionStatus]
  );

  const sendTimeUpdate = useCallback(
    (currentTime) => {
      if (connectionStatus === "connected") {
        syncService.sendTimeUpdate(currentTime);
      } else {
        console.log("Queueing time update - waiting for connection...");
        syncService.sendTimeUpdate(currentTime);
      }
    },
    [connectionStatus]
  );

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return syncService.isReady() && connectionStatus === "connected";
  }, [connectionStatus]);

  // Get detailed connection info
  const getConnectionInfo = useCallback(() => {
    return syncService.getConnectionInfo();
  }, []);

  // Check if service is ready
  const isReady = useCallback(() => {
    return syncService.isReady();
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
    getConnectionInfo,
    isReady,
    isConnected: getConnectionStatus(),
    connectionStatus,
  };
};
