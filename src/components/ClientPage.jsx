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

  // Drift correction state
  const [lastHostTime, setLastHostTime] = useState(0);
  const [lastHostTimestamp, setLastHostTimestamp] = useState(0);
  const [driftCorrection, setDriftCorrection] = useState(0);
  const [syncInterval, setSyncInterval] = useState(null);

  const audioElementRef = useRef(null);

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

  useEffect(() => {
    if (urlCode && !sessionCode) {
      dispatch(setSessionCode(urlCode));
      dispatch(setIsClient(true));

      // Always show name input modal for client page
      // This ensures consistent UX regardless of how user arrived at the page
      setShowNameInput(true);
    }
  }, [urlCode, sessionCode, dispatch]);

  // Check for existing session on page load (for page refresh recovery)
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
          if (sessionAge < 24 * 60 * 60 * 1000) {
            // Pre-fill the username but still show the input modal
            setUserName(storedUserName);
            dispatch(setSessionCode(urlCode));
            setShowNameInput(true); // Always show name input
            toast.success("Session restored from previous connection");
          } else {
            // Session too old, clear it
            localStorage.removeItem(`audionize_client_session_${urlCode}`);
            localStorage.removeItem(`audionize_user_${urlCode}`);
          }
        } catch (error) {
          console.error("Error parsing stored session:", error);
          localStorage.removeItem(`audionize_client_session_${urlCode}`);
          localStorage.removeItem(`audionize_user_${urlCode}`);
        }
      }
    }
  }, [urlCode, sessionCode, dispatch]);

  // Update connection status based on sync service
  useEffect(() => {
    if (syncConnected && userName) {
      setIsConnecting(false);
      dispatch(setSyncStatus("connected"));
      toast.success("Connected to session!");
    } else if (userName && !syncConnected) {
      // Still connecting
      setIsConnecting(true);
    }
  }, [syncConnected, userName, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear session from localStorage
      if (sessionCode) {
        localStorage.removeItem(`audionize_client_session_${sessionCode}`);
        localStorage.removeItem(`audionize_user_${sessionCode}`);
      }

      // Stop drift correction
      stopDriftCorrection();
    };
  }, [sessionCode]);

  // Enhanced sync handler with precise timing and drift correction
  const handleSync = (data) => {
    console.log("Received sync command:", data);

    if (!audioElementRef.current?.audio) {
      console.warn("Audio element not ready for sync");
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

  // Precise play synchronization with drift correction
  const handlePlaySync = (data, now, audio) => {
    const { scheduledTime, currentTime, networkLatency } = data;

    // Reset drift correction on new play command
    setDriftCorrection(0);
    setLastHostTime(currentTime);
    setLastHostTimestamp(now);

    // Compensate for estimated one-way latency (default to 0 if not provided)
    const estimatedLatency = networkLatency || 0;
    const timeUntilPlay = scheduledTime - now - estimatedLatency;

    if (timeUntilPlay > 0) {
      // Schedule play for future time
      console.log(
        `Scheduling play in ${timeUntilPlay}ms (latency compensated)`
      );
      setTimeout(() => {
        audio.currentTime = currentTime;
        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
        dispatch(setIsPlaying(true));
        dispatch(setCurrentTime(currentTime));

        // Start drift correction after play starts
        startDriftCorrection();
      }, timeUntilPlay);
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

      // Start drift correction after play starts
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
    console.log("Received audio sync:", data);
    try {
      // Handle audio buffer data
      if (data.audioBuffer) {
        const audioBlob = new Blob([new Uint8Array(data.audioBuffer)], {
          type: data.fileType || "audio/mpeg",
        });
        setAudioBlob(audioBlob);
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

  // Start drift correction interval
  const startDriftCorrection = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }

    const interval = setInterval(() => {
      if (
        audioElementRef.current?.audio &&
        !audioElementRef.current.audio.paused
      ) {
        // Request time update from host
        if (sendTimeUpdate) {
          sendTimeUpdate();
        }
      }
    }, 2000); // Check every 2 seconds

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

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    // Audio metadata loaded
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

    // Store client session info in localStorage for persistence
    localStorage.setItem(
      `audionize_client_session_${sessionCode}`,
      JSON.stringify({
        sessionCode,
        userName: name.trim(),
        timestamp: Date.now(),
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
  if (!userName || showNameInput) {
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
          <div className="mt-4">
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
        </div>

        {/* Modern Audio Player */}
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
