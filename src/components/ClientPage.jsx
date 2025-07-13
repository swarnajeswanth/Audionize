"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setSessionCode,
  setIsClient,
  clearSession,
} from "../store/slices/sessionSlice";
import {
  setAudioFile,
  setAudioUrl,
  setCurrentTime,
  setDuration,
  setIsPlaying,
} from "../store/slices/audioSlice";
import {
  setConnected,
  setSyncStatus,
  addSyncMessage,
  clearSync,
} from "../store/slices/syncSlice";
import { useSyncService } from "../hooks/useSyncService";
import ModernAudioPlayer from "./ModernAudioPlayer";
import NameInputModal from "./NameInputModal";
import LoadingState from "./LoadingState";
import BlueDots from "./BlueDots";
import toast from "react-hot-toast";
import { useApi } from "../hooks/useApi";

export default function ClientPage() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { sessionCode } = useAppSelector((state) => state.session);
  const { audioUrl } = useAppSelector((state) => state.audio);
  const { isConnected } = useAppSelector((state) => state.sync);

  const [userName, setUserName] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true); // Track if page is active
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Drift correction state
  const [lastHostTime, setLastHostTime] = useState(0);
  const [lastHostTimestamp, setLastHostTimestamp] = useState(0);
  const [driftCorrection, setDriftCorrection] = useState(0);
  const [syncInterval, setSyncInterval] = useState(null);

  const audioElementRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pageVisibilityRef = useRef(null);
  const pendingSyncCommands = useRef([]);

  const { getSessionStatus } = useApi();

  // Get session code from URL
  const urlCode = searchParams.get("code");

  // Always call useSyncService hook (Rules of Hooks compliance)
  // Pass empty strings if not ready to connect
  const {
    setMessageHandler,
    setClientUpdateHandler,
    setAudioUpdateHandler,
    sendTimeUpdate,
    isConnected: syncConnected,
  } = useSyncService(
    sessionCode || "",
    userName ? "client" : "",
    userName || "",
    (data) => {
      setHostDisconnected(true);
    }
  );

  // Track page visibility to detect when user navigates away
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageActive(isVisible);

      if (!isVisible && sessionCode && userName) {
        console.log("Page became hidden - client may have navigated away");
        // Don't disconnect immediately, give some time for the user to come back
        // The server will handle cleanup if the client doesn't return
      }
    };

    const handleBeforeUnload = (e) => {
      if (sessionCode && userName && !hostDisconnected) {
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue =
          "Are you sure you want to leave? You will be disconnected from the session.";
        return "Are you sure you want to leave? You will be disconnected from the session.";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    pageVisibilityRef.current = { handleVisibilityChange, handleBeforeUnload };

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionCode, userName, hostDisconnected]);

  useEffect(() => {
    if (urlCode && !sessionCode) {
      dispatch(setSessionCode(urlCode));
      dispatch(setIsClient(true));

      // Don't show name input here - let the session recovery logic handle it
      // The session recovery useEffect will determine if we need to show name input
    }
  }, [urlCode, sessionCode, dispatch]);

  // Enhanced session recovery with better persistence
  useEffect(() => {
    if (!sessionCode && urlCode) {
      // Try to recover session from localStorage
      const storedSession = localStorage.getItem(
        `audionize_client_session_${urlCode}`
      );
      const storedUserName = localStorage.getItem(`audionize_user_${urlCode}`);

      if (storedSession && storedUserName) {
        try {
          const sessionData = JSON.parse(storedSession);
          // Check if session is not too old (within last 24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          if (
            sessionAge < 24 * 60 * 60 * 1000 &&
            sessionData.autoConnect !== false
          ) {
            // Auto-connect with stored username - no need to show name input
            setUserName(storedUserName);
            dispatch(setSessionCode(urlCode));
            setShowNameInput(false); // Don't show name input for existing session
            setIsConnecting(true);

            // Update session timestamp to extend validity
            localStorage.setItem(
              `audionize_client_session_${urlCode}`,
              JSON.stringify({
                ...sessionData,
                lastActivity: Date.now(),
                timestamp: Date.now(), // Update timestamp
                autoConnect: true, // Ensure auto-connect is enabled
              })
            );

            toast.success("Session restored - reconnecting automatically");
          } else {
            // Session too old, clear it
            localStorage.removeItem(`audionize_client_session_${urlCode}`);
            localStorage.removeItem(`audionize_user_${urlCode}`);
            setShowNameInput(true); // Show name input for expired session
          }
        } catch (error) {
          console.error("Error parsing stored session:", error);
          localStorage.removeItem(`audionize_client_session_${urlCode}`);
          localStorage.removeItem(`audionize_user_${urlCode}`);
          setShowNameInput(true); // Show name input for corrupted session
        }
      } else {
        // No stored session, show name input
        setShowNameInput(true);
      }
    }
  }, [urlCode, sessionCode, dispatch]);

  // Update connection status based on sync service with reconnection logic
  useEffect(() => {
    if (syncConnected && userName) {
      setIsConnecting(false);
      dispatch(setSyncStatus("connected"));

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      toast.success("Connected to session!");
    } else if (userName && !syncConnected && !hostDisconnected) {
      // Still connecting or disconnected - attempt reconnection
      setIsConnecting(true);

      // Set up reconnection timeout if not already set
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect to session...");
          // The useSyncService hook will handle reconnection automatically
        }, 5000); // Wait 5 seconds before attempting reconnection
      }
    }
  }, [syncConnected, userName, hostDisconnected, dispatch]);

  // Update session activity timestamp periodically
  useEffect(() => {
    if (sessionCode && userName && !hostDisconnected) {
      const updateInterval = setInterval(() => {
        const storedSession = localStorage.getItem(
          `audionize_client_session_${sessionCode}`
        );
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            localStorage.setItem(
              `audionize_client_session_${sessionCode}`,
              JSON.stringify({
                ...sessionData,
                lastActivity: Date.now(),
              })
            );
          } catch (error) {
            console.error("Error updating session activity:", error);
          }
        }
      }, 60000); // Update every minute

      return () => clearInterval(updateInterval);
    }
  }, [sessionCode, userName, hostDisconnected]);

  // Enhanced cleanup on unmount with proper session cleanup
  useEffect(() => {
    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear session from localStorage only if host disconnected or user manually left
      if (sessionCode && (hostDisconnected || !isPageActive)) {
        localStorage.removeItem(`audionize_client_session_${sessionCode}`);
        localStorage.removeItem(`audionize_user_${sessionCode}`);
      }

      // Stop drift correction
      stopDriftCorrection();
    };
  }, [sessionCode, hostDisconnected, isPageActive]);

  // Enhanced sync handler with precise timing and drift correction
  const handleSync = (data) => {
    console.log("Received sync command:", data);
    if (
      !audioElementRef.current?.audio ||
      audioElementRef.current.audio.readyState < 2
    ) {
      console.warn("Audio element not ready for sync, queuing command");
      pendingSyncCommands.current.push(data);
      return;
    }
    const audio = audioElementRef.current.audio;
    const now = Date.now();

    switch (data.type) {
      case "play":
        handlePlaySync(data, now, audio);
        break;
      case "pause":
        handlePauseSync(data, now, audio);
        break;
      case "seek":
        handleSeekSync(data, now, audio);
        break;
      case "volume":
        handleVolumeSync(data, audio);
        break;
      case "sync_all":
        handleSyncAll(data, now, audio);
        break;
      case "time_update":
        handleTimeUpdateSync(data, now, audio);
        break;
      default:
        console.log("Unknown sync command:", data.type);
    }
  };

  // Ultra-precise play synchronization with minimal drift
  const handlePlaySync = (data, now, audio) => {
    const { scheduledTime, currentTime, networkLatency } = data;

    // Reset drift correction on new play command
    setDriftCorrection(0);
    setLastHostTime(currentTime);
    setLastHostTimestamp(now);

    // Use more precise latency compensation
    const estimatedLatency = networkLatency || 0;
    const timeUntilPlay = scheduledTime - now - estimatedLatency;

    // Use requestAnimationFrame for more precise timing
    const schedulePlay = (targetTime) => {
      const checkTime = () => {
        const currentTime = performance.now();
        if (currentTime >= targetTime) {
          // Execute play command
          audio.currentTime = data.currentTime;
          audio.play().catch((error) => {
            console.error("Error playing audio:", error);
          });
          dispatch(setIsPlaying(true));
          dispatch(setCurrentTime(data.currentTime));
          startDriftCorrection();
        } else {
          // Continue checking
          requestAnimationFrame(checkTime);
        }
      };
      requestAnimationFrame(checkTime);
    };

    if (timeUntilPlay > 0) {
      // Schedule play for future time with precise timing
      console.log(
        `Scheduling play in ${timeUntilPlay.toFixed(2)}ms (latency compensated)`
      );
      const targetTime = performance.now() + timeUntilPlay;
      schedulePlay(targetTime);
    } else {
      // Play immediately if scheduled time has passed
      console.log(
        "Scheduled time passed, playing immediately (latency compensated)"
      );
      audio.currentTime = currentTime;
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      dispatch(setIsPlaying(true));
      dispatch(setCurrentTime(currentTime));
      startDriftCorrection();
    }
  };

  // Precise pause synchronization
  const handlePauseSync = (data, now, audio) => {
    const { currentTime } = data;

    // Stop drift correction on pause
    stopDriftCorrection();

    audio.pause();
    audio.currentTime = currentTime;
    dispatch(setIsPlaying(false));
    dispatch(setCurrentTime(currentTime));
  };

  // Precise seek synchronization
  const handleSeekSync = (data, now, audio) => {
    const { currentTime } = data;

    audio.currentTime = currentTime;
    dispatch(setCurrentTime(currentTime));
  };

  // Volume synchronization
  const handleVolumeSync = (data, audio) => {
    const { volume } = data;
    audio.volume = volume;
  };

  // Sync all clients to current position
  const handleSyncAll = (data, now, audio) => {
    const { currentTime } = data;

    if (audio.paused) {
      audio.currentTime = currentTime;
      dispatch(setCurrentTime(currentTime));
    } else {
      // If playing, schedule a precise sync
      const syncDelay = 100; // Small delay for sync
      setTimeout(() => {
        audio.currentTime = currentTime;
        dispatch(setCurrentTime(currentTime));
      }, syncDelay);
    }
  };

  // Handle audio sync from server
  const handleAudioSync = (data) => {
    console.log("[CLIENT] Received audio sync event:", data);
    try {
      // Reset client ready flag for new audio
      const syncService = require("../services/syncService").default;
      if (syncService.socket) {
        syncService.socket.clientReadySent = false;
        console.log("[CLIENT] Reset clientReadySent flag for new audio");
      }
      setReadinessWarning(false);
      if (readinessTimeout) clearTimeout(readinessTimeout);
      // Start 1-minute timeout to check readiness
      const timeout = setTimeout(() => {
        if (!syncService.socket?.clientReadySent) {
          setReadinessWarning(true);
          // Retry emitting client-ready
          emitClientReady();
        }
      }, 60000);
      setReadinessTimeout(timeout);

      // Handle audio buffer data
      if (data.audioBuffer) {
        const audioBlob = new Blob([new Uint8Array(data.audioBuffer)], {
          type: data.fileType || "audio/mpeg",
        });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        console.log("[CLIENT] Created audio URL from buffer:", url);
        dispatch(setAudioUrl(url));
        dispatch(setAudioFile(audioBlob));
        toast.success("New audio received from host");
      }
      // Handle audio URL data
      else if (data.audioUrl) {
        console.log("[CLIENT] Received audioUrl:", data.audioUrl);
        dispatch(setAudioUrl(data.audioUrl));
        toast.success("New audio received from host");
      } else {
        console.warn("[CLIENT] No audioBuffer or audioUrl in audio sync data");
      }
    } catch (error) {
      console.error("[CLIENT] Error processing audio sync:", error);
      toast.error("Failed to load audio from host");
    }
  };

  // Handle time updates from host for drift correction
  const handleTimeUpdateSync = (data, now, audio) => {
    const { currentTime, timestamp } = data;

    if (!audio || audio.paused) return;

    // Calculate expected time based on host's time and elapsed time
    const timeElapsed = (now - lastHostTimestamp) / 1000;
    const expectedTime = lastHostTime + timeElapsed;
    const actualTime = audio.currentTime;
    const drift = actualTime - expectedTime;

    // Update host time reference
    setLastHostTime(currentTime);
    setLastHostTimestamp(now);

    // Apply drift correction if significant
    if (Math.abs(drift) > 0.05) {
      // 50ms threshold
      console.log(`Drift detected: ${drift.toFixed(3)}s, correcting...`);
      const newCorrection = driftCorrection + drift;
      setDriftCorrection(newCorrection);

      // Apply correction to audio
      audio.currentTime = expectedTime;
      dispatch(setCurrentTime(expectedTime));
    }
  };

  // Enhanced drift correction with higher frequency
  const startDriftCorrection = () => {
    stopDriftCorrection(); // Clear any existing interval

    const interval = setInterval(() => {
      if (!audioElementRef.current?.audio || !isPlaying) {
        stopDriftCorrection();
        return;
      }

      const audio = audioElementRef.current.audio;
      const now = Date.now();
      const expectedTime = lastHostTime + (now - lastHostTimestamp) / 1000;
      const actualTime = audio.currentTime;
      const drift = actualTime - expectedTime;

      // Only correct if drift is significant (>50ms)
      if (Math.abs(drift) > 0.05) {
        console.log(`Drift correction: ${drift.toFixed(3)}s`);
        audio.currentTime = expectedTime;
        setDriftCorrection(drift);
      } else {
        setDriftCorrection(0);
      }
    }, 500); // Check every 500ms instead of 1000ms for more responsive correction

    setSyncInterval(interval);
  };

  // Stop drift correction interval
  const stopDriftCorrection = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      setSyncInterval(null);
    }
  };

  // Handle time updates to send to host
  const handleTimeUpdate = () => {
    if (sendTimeUpdate) {
      sendTimeUpdate();
    }
  };

  // Notify server when audio is ready
  const handleLoadedMetadata = () => {
    console.log("[CLIENT] onLoadedMetadata fired");
    console.log("[CLIENT] Audio element:", !!audioElementRef.current?.audio);
    console.log("[CLIENT] Session code:", sessionCode);
    console.log("[CLIENT] User name:", userName);

    if (audioElementRef.current?.audio && sessionCode && userName) {
      // Notify server that this client is ready
      const syncService = require("../services/syncService").default;
      if (syncService.socket) {
        // Prevent duplicate client-ready events
        if (!syncService.socket.clientReadySent) {
          syncService.socket.emit("client-ready", {
            sessionCode,
            clientId: syncService.socket.id,
          });
          syncService.socket.clientReadySent = true;
          console.log("[CLIENT] Notified server: client ready to play");
        } else {
          console.log("[CLIENT] Client ready already sent, skipping duplicate");
        }
      } else {
        console.log("[CLIENT] No socket connection available");
      }
      // Process any queued sync commands
      while (pendingSyncCommands.current.length > 0) {
        handleSync(pendingSyncCommands.current.shift());
      }
    } else {
      console.log("[CLIENT] Missing required data for client ready");
    }
  };

  // Notify server when audio becomes unavailable
  const handleAudioError = () => {
    console.log("[CLIENT] Audio error or unavailable");
    if (sessionCode && userName) {
      const syncService = require("../services/syncService").default;
      if (syncService.socket) {
        syncService.socket.emit("client-not-ready", {
          sessionCode,
          clientId: syncService.socket.id,
        });
        // Reset the ready flag so we can send ready again when audio is fixed
        if (syncService.socket.clientReadySent) {
          syncService.socket.clientReadySent = false;
        }
        console.log("[CLIENT] Notified server: client not ready");
      }
    }
  };

  // Client Audio Player Event Handlers (client only controls volume/mute)
  const handlePlay = () => {
    // Client cannot control play - this should be disabled
    console.log("Client play event - ignored (host controlled)");
    // Don't dispatch setIsPlaying - let host control it
  };

  const handlePause = () => {
    // Client cannot control pause - this should be disabled
    console.log("Client pause event - ignored (host controlled)");
    // Don't dispatch setIsPlaying - let host control it
  };

  const handleSeek = (time) => {
    // Client cannot control seek - this should be disabled
    console.log("Client seek event - ignored (host controlled)");
    // Don't dispatch setCurrentTime - let host control it
  };

  const handleVolumeChange = (volume) => {
    // Client can control their own volume
    console.log("Client volume changed:", volume);
    // This is allowed - client controls their own volume
  };

  // Handle name submission
  const handleNameSubmit = (name) => {
    // Validate that name is not empty
    if (!name || !name.trim()) {
      toast.error("Please enter a valid name");
      return;
    }

    setUserName(name.trim());
    localStorage.setItem(`audionize_user_${sessionCode}`, name.trim());
    setShowNameInput(false);
    setIsConnecting(true);

    // Store client session info in localStorage for persistence with enhanced data
    localStorage.setItem(
      `audionize_client_session_${sessionCode}`,
      JSON.stringify({
        sessionCode,
        userName: name.trim(),
        timestamp: Date.now(),
        lastActivity: Date.now(),
        connectionAttempts: 0,
        autoConnect: true, // Flag to indicate this session should auto-connect
      })
    );

    // Set connection status to connecting
    dispatch(setConnected(true));
    dispatch(setSyncStatus("connecting"));

    // The sync service will automatically connect when userName is set
    // due to the useSyncService hook dependency on userName
    toast.success("Connecting to session...");
  };

  // Handle manual disconnect
  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to leave this session?")) {
      // Mark that user manually left
      setIsPageActive(false);

      // Clear all state
      dispatch(clearSync());
      dispatch(clearSession());
      dispatch(setAudioUrl(null));
      dispatch(setAudioFile(null));

      // Clear localStorage
      if (sessionCode) {
        localStorage.removeItem(`audionize_client_session_${sessionCode}`);
        localStorage.removeItem(`audionize_user_${sessionCode}`);
      }

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Redirect to home page
      window.location.href = "/";
    }
  };

  // Set up message handler only when we have all required data
  useEffect(() => {
    if (setMessageHandler && sessionCode && userName) {
      setMessageHandler(handleSync);
    }
  }, [setMessageHandler, sessionCode, userName]);

  // Set up audio update handler only when we have all required data
  useEffect(() => {
    if (setAudioUpdateHandler && sessionCode && userName) {
      setAudioUpdateHandler(handleAudioSync);
    }
  }, [setAudioUpdateHandler, sessionCode, userName]);

  // Set up client update handler only when we have all required data
  useEffect(() => {
    if (setClientUpdateHandler && sessionCode && userName) {
      setClientUpdateHandler((data) => {
        console.log("Client update:", data);
      });
    }
  }, [setClientUpdateHandler, sessionCode, userName]);

  // Add this effect after your imports and before the return statement
  useEffect(() => {
    if (sessionCode) {
      const storedUserName = localStorage.getItem(
        `audionize_user_${sessionCode}`
      );
      if (storedUserName) {
        setUserName(storedUserName);
        setShowNameInput(false);
      } else {
        setShowNameInput(true);
      }
    }
  }, [sessionCode]);

  useEffect(() => {
    const syncService = require("../services/syncService").default;
    if (!syncService.socket) return;
    const handleDisconnect = () => {
      setIsReconnecting(true);
      // Try to reconnect after a short delay
      setTimeout(() => {
        syncService.connect(sessionCode, "client", userName).then(() => {
          setIsReconnecting(false);
        });
      }, 2000);
    };
    syncService.socket.on("disconnect", handleDisconnect);
    return () => {
      syncService.socket.off("disconnect", handleDisconnect);
    };
  }, [sessionCode, userName]);

  const [waitingForHost, setWaitingForHost] = useState(false);
  const [waitCountdown, setWaitCountdown] = useState(120); // 2 minutes
  const waitIntervalRef = useRef(null);

  // Wait for host polling logic
  useEffect(() => {
    if (!waitingForHost || !sessionCode) return;
    let isMounted = true;
    setWaitCountdown(120);
    waitIntervalRef.current = setInterval(async () => {
      setWaitCountdown((prev) => prev - 3);
      try {
        // Poll the server for session status
        const status = await getSessionStatus(sessionCode);
        if (status?.data?.host) {
          // Host is back!
          if (isMounted) {
            setWaitingForHost(false);
            setHostDisconnected(false);
            setIsConnecting(true);
            toast.success("Host has returned! Reconnecting...");
            // The useSyncService hook will handle reconnection
          }
        }
      } catch (err) {
        // Ignore errors, keep polling
      }
    }, 3000);
    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      setWaitingForHost(false);
      setHostDisconnected(false);
      toast.error("Host did not return. Redirecting to home page.");
      window.location.href = "/";
    }, 120000);
    return () => {
      isMounted = false;
      clearInterval(waitIntervalRef.current);
      clearTimeout(timeout);
    };
  }, [waitingForHost, sessionCode, getSessionStatus]);

  // Patch host disconnect/session-not-found handlers to use wait mode
  useEffect(() => {
    const syncService = require("../services/syncService").default;
    if (!syncService.socket) return;
    const handleHostDisconnect = (data) => {
      setWaitingForHost(true);
      setHostDisconnected(true);
      dispatch(clearSync());
      dispatch(clearSession());
      toast.error(
        data.message || "Host disconnected. Waiting for host to return..."
      );
    };
    const handleSessionNotFound = (data) => {
      setWaitingForHost(true);
      setHostDisconnected(true);
      dispatch(clearSync());
      dispatch(clearSession());
      toast.error(
        data.message ||
          "Session not found or host not active. Waiting for host..."
      );
    };
    const handleSocketDisconnect = () => {
      setWaitingForHost(true);
      setHostDisconnected(true);
      dispatch(clearSync());
      dispatch(clearSession());
      toast.error("Disconnected from sync server. Waiting for host...");
    };
    syncService.socket.on("host_disconnect", handleHostDisconnect);
    syncService.socket.on("session-not-found", handleSessionNotFound);
    syncService.socket.on("disconnect", handleSocketDisconnect);
    return () => {
      if (syncService.socket) {
        syncService.socket.off("host_disconnect", handleHostDisconnect);
        syncService.socket.off("session-not-found", handleSessionNotFound);
        syncService.socket.off("disconnect", handleSocketDisconnect);
      }
    };
  }, [dispatch]);

  // Add state for readiness timeout and warning
  const [readinessTimeout, setReadinessTimeout] = useState(null);
  const [readinessWarning, setReadinessWarning] = useState(false);

  // Helper to emit client-ready robustly with debouncing
  const emitClientReady = () => {
    if (!syncService.socket?.clientReadySent) {
      syncService.emit("client-ready", {
        name: userName,
        id: syncService.socket.id,
      });
      syncService.socket.clientReadySent = true;
      console.log("[CLIENT] Emitted client-ready (manual/timeout)");

      // Reset the flag after a delay to allow re-emission if needed
      setTimeout(() => {
        if (syncService.socket) {
          syncService.socket.clientReadySent = false;
        }
      }, 5000); // Allow re-emission after 5 seconds
    }
  };

  // Show loading if no session code
  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Loading session..."
          size="large"
        />
      </div>
    );
  }

  // Show name input if no username or if name input modal is active
  if (!userName && showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <NameInputModal
          isOpen={true}
          onClose={() => {}} // Can't close, must enter name
          onSubmit={handleNameSubmit}
          initialValue={userName} // Pre-fill with existing username if available
        />
      </div>
    );
  }

  // Show connecting state
  if (isConnecting && userName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Connecting to session..."
          size="large"
        />
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Reconnecting..."
          size="large"
        />
      </div>
    );
  }

  // Show waiting for host UI
  if (waitingForHost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <LoadingState
          isLoading={true}
          loadingText={`Waiting for host to return... (${waitCountdown}s)`}
          size="large"
        />
        <div className="mt-6 text-center">
          <p className="text-slate-300 mb-2">
            The host has disconnected. We are waiting for them to return.
            <br />
            If the host rejoins within 2 minutes, you will be reconnected
            automatically.
          </p>
          <button
            onClick={handleDisconnect}
            className="mt-4 bg-red-500 hover:bg-red-600 px-6 py-3 rounded text-white font-semibold"
          >
            Leave Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <BlueDots />
      <div className="content-layer max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Client Session</h1>
          <p className="text-slate-300">
            Session: <span className="font-mono">{sessionCode}</span>
          </p>
          <p className="text-slate-400 text-sm">
            Connected as: <span className="font-medium">{userName}</span>
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={handleDisconnect}
              disabled={hostDisconnected}
              className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors ${
                hostDisconnected
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {hostDisconnected ? "Redirecting..." : "Leave Session"}
            </button>

            {/* Reset Session Button - allows user to change their name */}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Reset your session? You'll need to enter your name again."
                  )
                ) {
                  // Clear session data
                  localStorage.removeItem(
                    `audionize_client_session_${sessionCode}`
                  );
                  localStorage.removeItem(`audionize_user_${sessionCode}`);

                  // Reset state
                  setUserName("");
                  setShowNameInput(true);
                  setIsConnecting(false);

                  // Clear sync state
                  dispatch(clearSync());
                  dispatch(setAudioUrl(null));
                  dispatch(setAudioFile(null));

                  toast.success("Session reset - please enter your name");
                }
              }}
              disabled={hostDisconnected}
              className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors ${
                hostDisconnected
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              Reset Session
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-8">
          {hostDisconnected ? (
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/50">
              <div className="w-3 h-3 rounded-full mr-2 bg-red-400"></div>
              Host Disconnected - Redirecting...
            </div>
          ) : (
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                syncConnected
                  ? "bg-green-500/20 text-green-300 border border-green-500/50"
                  : "bg-red-500/20 text-red-300 border border-red-500/50"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  syncConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              ></div>
              {syncConnected ? "Connected to Host" : "Disconnected"}
            </div>
          )}

          {/* Page Activity Status */}
          <div className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/50">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                isPageActive ? "bg-blue-400 animate-pulse" : "bg-gray-400"
              }`}
            ></div>
            {isPageActive ? "Active" : "Inactive"}
          </div>
        </div>

        {/* Modern Audio Player */}
        {readinessWarning && (
          <div className="text-red-400 text-sm mb-4 text-center">
            Audio failed to load or sync within 1 minute. Please check your
            connection or try rejoining.
          </div>
        )}
        {audioUrl && !hostDisconnected ? (
          <div className="mb-8">
            {/* Drift Correction Status */}
            {Math.abs(driftCorrection) > 0.01 && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-pulse rounded-full h-4 w-4 border-2 border-yellow-400 mr-2"></div>
                  <span className="text-yellow-300 text-sm">
                    Syncing audio timing... (Drift: {driftCorrection.toFixed(3)}
                    s)
                  </span>
                </div>
              </div>
            )}
            <ModernAudioPlayer
              ref={audioElementRef}
              audioUrl={audioUrl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleAudioError}
              isHost={false}
              disabled={false}
            />
          </div>
        ) : hostDisconnected ? (
          <div className="text-center py-16 bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-2xl mb-8">
            <div className="text-red-400 mb-6">
              <svg
                className="w-20 h-20 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-red-300 mb-3">
              Host Disconnected
            </h3>
            <p className="text-red-400 max-w-md mx-auto">
              The host has left the session. You will be redirected to the home
              page shortly.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl mb-8">
            <div className="text-slate-400 mb-6">
              <svg
                className="w-20 h-20 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-slate-300 mb-3">
              Waiting for Host
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              The host will upload audio and start the session. You'll see the
              music player here once they begin. You can control your volume,
              but playback is controlled by the host.
            </p>
          </div>
        )}

        {/* Session Info */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Session Information
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">Your Name:</span>
              <span className="text-white font-medium">{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Session Code:</span>
              <span className="text-white font-mono">{sessionCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Connection Status:</span>
              <span
                className={`font-medium ${
                  hostDisconnected
                    ? "text-red-400"
                    : syncConnected
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {hostDisconnected
                  ? "Host Disconnected"
                  : syncConnected
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Audio Status:</span>
              <span
                className={`font-medium ${
                  audioUrl ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {audioUrl ? "Audio Available" : "Waiting for Audio"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Player Control:</span>
              <span className="text-blue-400 font-medium">Volume Only</span>
            </div>
            {process.env.NODE_ENV === "development" && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-300">Drift Correction:</span>
                  <span
                    className={`font-medium ${
                      Math.abs(driftCorrection) > 0.05
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {driftCorrection.toFixed(3)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Last Host Time:</span>
                  <span className="text-white font-mono">
                    {lastHostTime.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Sync Interval:</span>
                  <span
                    className={`font-medium ${
                      syncInterval ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {syncInterval ? "Active" : "Inactive"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
