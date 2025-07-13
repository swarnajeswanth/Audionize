import React, { useEffect, useCallback, useRef } from "react";
import syncService from "../services/syncService";
import reconnectionService from "../services/reconnectionService";
import connectionStateManager from "../services/connectionStateManager";
import toast from "react-hot-toast";
import { useAppDispatch } from "../store/hooks";
import { setAudioUrl, setAudioFile } from "../store/slices/audioSlice";
import {
  clearSync,
  setConnected,
  setSyncStatus,
} from "../store/slices/syncSlice";
import { clearSession } from "../store/slices/sessionSlice";

export const useEnhancedSyncService = (
  sessionCode,
  role,
  userName,
  onHostDisconnect = null,
  syncConfig = {}
) => {
  const dispatch = useAppDispatch();
  const isConnectedRef = useRef(false);
  const prevSessionCode = useRef();
  const prevRole = useRef();
  const prevUserName = useRef();

  // Default sync configuration
  const defaultConfig = React.useMemo(
    () => ({
      syncTolerance: 100,
      playDelay: 1000,
      driftCorrectionThreshold: 0.1,
      pingInterval: 5000,
      maxLatency: 500,
      ...syncConfig,
    }),
    [syncConfig]
  );

  // Initialize connection state manager
  useEffect(() => {
    if (sessionCode && role && userName) {
      connectionStateManager.initialize(sessionCode, role, userName);
      reconnectionService.initialize(sessionCode, role, userName);
    }
  }, [sessionCode, role, userName]);

  // Main connection effect
  useEffect(() => {
    const shouldConnect =
      sessionCode &&
      role &&
      userName &&
      (sessionCode !== prevSessionCode.current ||
        role !== prevRole.current ||
        userName !== prevUserName.current);

    let didConnect = false;

    if (shouldConnect && !isConnectedRef.current) {
      const connectToServer = async () => {
        try {
          console.log("Connecting to sync service:", {
            sessionCode,
            role,
            userName,
            config: defaultConfig,
          });

          connectionStateManager.setReconnecting();

          // Apply sync configuration
          syncService.syncTolerance = defaultConfig.syncTolerance;
          syncService.pingInterval = defaultConfig.pingInterval;

          await syncService.connect(sessionCode, role, userName);

          isConnectedRef.current = true;
          connectionStateManager.setConnected();

          // Update Redux state
          dispatch(setConnected(true));
          dispatch(setSyncStatus("connected"));

          console.log("Successfully connected to sync service");
          didConnect = true;
        } catch (error) {
          console.error("Failed to connect to sync service:", error);
          connectionStateManager.setError(error);
          dispatch(setConnected(false));
          dispatch(setSyncStatus("error"));
          toast.error("Failed to connect to sync service");
        }
      };
      connectToServer();
    }

    // Update refs after attempting connection
    prevSessionCode.current = sessionCode;
    prevRole.current = role;
    prevUserName.current = userName;

    // Cleanup on unmount
    return () => {
      if (isConnectedRef.current) {
        console.log("Disconnecting from sync service");
        syncService.disconnect();
        reconnectionService.cleanup();
        connectionStateManager.cleanup();
        isConnectedRef.current = false;
        dispatch(setConnected(false));
        dispatch(setSyncStatus("disconnected"));
      }
    };
  }, [sessionCode, role, userName, dispatch, defaultConfig]);

  // Set up reconnection service event handlers
  useEffect(() => {
    const handleReconnectionEvent = (event, data) => {
      switch (event) {
        case "reconnecting":
          connectionStateManager.setReconnecting(data.attempts);
          break;
        case "reconnected":
          connectionStateManager.setConnected();
          dispatch(setConnected(true));
          dispatch(setSyncStatus("connected"));
          break;
        case "reconnect_failed":
          connectionStateManager.incrementReconnectAttempts();
          break;
        case "reconnect_failed_final":
          connectionStateManager.setError("Reconnection failed");
          dispatch(setConnected(false));
          dispatch(setSyncStatus("error"));
          break;
        case "disconnected_manual":
          connectionStateManager.setDisconnected("Manual disconnect");
          break;
        case "disconnected_no_session":
          connectionStateManager.setDisconnected("No session details");
          break;
      }
    };

    const unsubscribe = reconnectionService.subscribe(handleReconnectionEvent);
    return unsubscribe;
  }, [dispatch]);

  // Set up sync service event handlers
  useEffect(() => {
    if (!syncService.socket) return;

    const handleConnect = () => {
      connectionStateManager.setConnected();
      reconnectionService.handleConnect();
    };

    const handleDisconnect = (reason) => {
      connectionStateManager.setDisconnected(reason);
      reconnectionService.handleDisconnect(reason);
    };

    const handleConnectError = (error) => {
      connectionStateManager.setError(error);
      reconnectionService.handleConnectError(error);
    };

    const handleReconnect = (attemptNumber) => {
      connectionStateManager.setConnected();
      reconnectionService.handleReconnect(attemptNumber);
    };

    const handleReconnectError = (error) => {
      connectionStateManager.setError(error);
      reconnectionService.handleReconnectError(error);
    };

    const handleReconnectFailed = () => {
      connectionStateManager.setError("Reconnection failed");
      reconnectionService.handleReconnectFailed();
    };

    // Set up event listeners
    syncService.socket.on("connect", handleConnect);
    syncService.socket.on("disconnect", handleDisconnect);
    syncService.socket.on("connect_error", handleConnectError);
    syncService.socket.on("reconnect", handleReconnect);
    syncService.socket.on("reconnect_error", handleReconnectError);
    syncService.socket.on("reconnect_failed", handleReconnectFailed);

    // Cleanup
    return () => {
      if (syncService.socket) {
        syncService.socket.off("connect", handleConnect);
        syncService.socket.off("disconnect", handleDisconnect);
        syncService.socket.off("connect_error", handleConnectError);
        syncService.socket.off("reconnect", handleReconnect);
        syncService.socket.off("reconnect_error", handleReconnectError);
        syncService.socket.off("reconnect_failed", handleReconnectFailed);
      }
    };
  }, []);

  // Handle room-full event
  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        toast.error(data.message);
      };
      syncService.socket.on("room-full", handler);

      return () => {
        if (syncService.socket) {
          syncService.socket.off("room-full", handler);
        }
      };
    }
    return () => {};
  }, [sessionCode, role, userName]);

  // Handle host disconnection with enhanced logic
  useEffect(() => {
    if (syncService.socket) {
      const handler = (data) => {
        console.log("Host disconnected:", data);

        // Call the optional callback if provided
        if (onHostDisconnect) {
          onHostDisconnect(data);
        }

        // Set host disconnected state
        connectionStateManager.setHostDisconnected(true);

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

        // Show notification with grace period info
        const gracePeriod = data.gracePeriod || 300000; // 5 minutes default
        const graceMinutes = Math.floor(gracePeriod / 60000);

        toast.error(
          `Host has disconnected. Waiting for reconnection... (${graceMinutes} minutes)`,
          { duration: 10000 }
        );
      };

      syncService.socket.on("host_disconnect", handler);

      return () => {
        if (syncService.socket) {
          syncService.socket.off("host_disconnect", handler);
        }
      };
    }
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

  // Send commands with connection check
  const sendAudio = useCallback((audioBuffer, fileName, fileSize, fileType) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendAudio(audioBuffer, fileName, fileSize, fileType);
    } else {
      console.log("Queueing audio send - waiting for connection...");
      syncService.sendAudio(audioBuffer, fileName, fileSize, fileType);
    }
  }, []);

  const sendPlay = useCallback((scheduledTime = 0, currentTime = 0) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendPlay(scheduledTime, currentTime);
    } else {
      console.log("Queueing play command - waiting for connection...");
      syncService.sendPlay(scheduledTime, currentTime);
    }
  }, []);

  const sendPause = useCallback((currentTime = 0) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendPause(currentTime);
    } else {
      console.log("Queueing pause command - waiting for connection...");
      syncService.sendPause(currentTime);
    }
  }, []);

  const sendSeek = useCallback((currentTime) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendSeek(currentTime);
    } else {
      console.log("Queueing seek command - waiting for connection...");
      syncService.sendSeek(currentTime);
    }
  }, []);

  const sendVolume = useCallback((volume) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendVolume(volume);
    } else {
      console.log("Queueing volume command - waiting for connection...");
      syncService.sendVolume(volume);
    }
  }, []);

  const sendSyncAll = useCallback((currentTime) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendSyncAll(currentTime);
    } else {
      console.log("Queueing sync all command - waiting for connection...");
      syncService.sendSyncAll(currentTime);
    }
  }, []);

  const sendTimeUpdate = useCallback((currentTime) => {
    if (connectionStateManager.getState().status === "connected") {
      syncService.sendTimeUpdate(currentTime);
    } else {
      console.log("Queueing time update - waiting for connection...");
      syncService.sendTimeUpdate(currentTime);
    }
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return (
      syncService.isReady() &&
      connectionStateManager.getState().status === "connected"
    );
  }, []);

  // Get detailed connection info
  const getConnectionInfo = useCallback(() => {
    return {
      ...syncService.getConnectionInfo(),
      connectionState: connectionStateManager.getStatusSummary(),
      reconnectionStatus: reconnectionService.getStatus(),
    };
  }, []);

  // Check if service is ready
  const isReady = useCallback(() => {
    return syncService.isReady();
  }, []);

  // Manual reconnection trigger
  const triggerReconnection = useCallback(async () => {
    return reconnectionService.triggerReconnection();
  }, []);

  // Cancel reconnection
  const cancelReconnection = useCallback(() => {
    reconnectionService.cancelReconnection();
  }, []);

  // Handle mic toggle
  const handleMicToggle = useCallback((isMuted) => {
    if (syncService.socket) {
      syncService.socket.emit("mic-status", { isMuted });
    }
  }, []);

  return {
    // Connection status
    getConnectionStatus,
    getConnectionInfo,
    isReady,

    // Message handlers
    setMessageHandler,
    setClientUpdateHandler,
    setAudioUpdateHandler,

    // Send commands
    sendAudio,
    sendPlay,
    sendPause,
    sendSeek,
    sendVolume,
    sendSyncAll,
    sendTimeUpdate,

    // Reconnection
    triggerReconnection,
    cancelReconnection,

    // Mic control
    handleMicToggle,

    // Raw service access
    syncService,
    reconnectionService,
    connectionStateManager,
  };
};

export default useEnhancedSyncService;
