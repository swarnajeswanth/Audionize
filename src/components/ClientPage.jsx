"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useSession as useSessionStore, useSync } from "../store/hooks";
import { setSessionCode, setIsClient } from "../store/slices/sessionSlice";
import {
  setConnected,
  setSyncStatus,
  addSyncMessage,
} from "../store/slices/syncSlice";
import {
  setAudioUrl,
  setCurrentTime,
  setDuration,
  setAudioFile,
  setIsPlaying,
} from "../store/slices/audioSlice";
import { useSyncService } from "../hooks/useSyncService";
import LoadingState from "./LoadingState";
import toast from "react-hot-toast";

export default function ClientPage() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { sessionCode } = useSessionStore();
  const { isConnected, syncStatus, connectedClients } = useSync();
  const { audioUrl, currentTime, duration, isPlaying } = useAppSelector(
    (state) => state.audio
  );

  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const audioRef = useRef();

  // Get session code from URL
  const urlCode = searchParams.get("code");

  useEffect(() => {
    if (urlCode && !sessionCode) {
      dispatch(setSessionCode(urlCode));
      dispatch(setIsClient(true));

      // Get stored username for this session
      const storedName = localStorage.getItem(`audionize_user_${urlCode}`);
      if (storedName) {
        setUserName(storedName);
      }
    }
  }, [urlCode, sessionCode, dispatch]);

  // Handle sync messages from host
  const handleSync = (data) => {
    console.log("Received sync data:", data);

    if (data.type === "audio_uploaded") {
      // Host uploaded new audio
      try {
        // Convert the received data to a proper blob
        const audioBlob = new Blob([data.audioBlob], { type: "audio/mpeg" });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        dispatch(setAudioUrl(url));
        dispatch(setAudioFile(audioBlob));
        toast.success("New audio received from host");
      } catch (error) {
        console.error("Error processing audio:", error);
        toast.error("Failed to load audio from host");
      }
    } else if (data.type === "play") {
      // Host started playing
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime || 0;
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          toast.error("Failed to play audio");
        });
        dispatch(setCurrentTime(data.currentTime || 0));
      }
    } else if (data.type === "pause") {
      // Host paused
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else if (data.type === "seek") {
      // Host seeked to new position
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        dispatch(setCurrentTime(data.currentTime));
      }
    } else if (data.type === "volume") {
      // Host changed volume
      if (audioRef.current) {
        audioRef.current.volume = data.volume;
      }
    }

    dispatch(addSyncMessage({ type: "received", data }));
  };

  // Only connect to sync service when both sessionCode and userName are set
  let setMessageHandler = null;
  let sendTimeUpdate = null;
  if (sessionCode && userName) {
    const syncApi = useSyncService(sessionCode, "client", userName);
    setMessageHandler = syncApi.setMessageHandler;
    sendTimeUpdate = syncApi.sendTimeUpdate;
  }

  // Set up message handler
  useEffect(() => {
    if (setMessageHandler) {
      setMessageHandler(handleSync);
    }
  }, [setMessageHandler]);

  useEffect(() => {
    if (sessionCode && userName) {
      setIsLoading(true);
      setError(null);

      // Simulate connection delay
      setTimeout(() => {
        dispatch(setConnected(true));
        dispatch(setSyncStatus("connected"));
        setIsLoading(false);
        toast.success("Connected to session!");
      }, 1000);
    }
  }, [sessionCode, userName, dispatch]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      dispatch(setCurrentTime(time));

      // Send sync update to host
      sendTimeUpdate(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration));
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch(setCurrentTime(time));
    }
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Waiting for session code..."
          size="large"
        />
      </div>
    );
  }

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-8 bg-slate-800/80 border border-white/10 p-8 rounded-xl max-w-md w-full">
          <h3 className="text-xl font-semibold mb-4">Enter Your Name</h3>
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === "Enter" && userName.trim()) {
                localStorage.setItem(
                  `audionize_user_${sessionCode}`,
                  userName.trim()
                );
                setUserName(userName.trim());
              }
            }}
          />
          <button
            onClick={() => {
              if (userName.trim()) {
                localStorage.setItem(
                  `audionize_user_${sessionCode}`,
                  userName.trim()
                );
                setUserName(userName.trim());
              }
            }}
            disabled={!userName.trim()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 px-6 py-2 rounded text-white transition-colors"
          >
            Join Session
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Connection Error
          </h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Client Session</h1>
            <p className="text-slate-300">
              Session Code: <span className="font-mono">{sessionCode}</span>
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? "bg-green-500/30 text-green-300 border border-green-500/50"
                  : "bg-red-500/30 text-red-300 border border-red-500/50"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              ></div>
              {isConnected ? "Connected" : "Disconnected"}
            </div>
            <div className="mt-2">
              <div
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  syncStatus === "connected"
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : syncStatus === "syncing"
                    ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/50"
                    : "bg-gray-500/30 text-gray-300 border border-gray-500/50"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    syncStatus === "connected"
                      ? "bg-blue-400"
                      : syncStatus === "syncing"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
                {syncStatus || "Unknown"}
              </div>
            </div>
          </div>
        </div>

        {!userName ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-4">Enter Your Name</h3>
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === "Enter" && userName.trim()) {
                  localStorage.setItem(
                    `audionize_user_${sessionCode}`,
                    userName.trim()
                  );
                  setUserName(userName.trim());
                }
              }}
            />
            <button
              onClick={() => {
                if (userName.trim()) {
                  localStorage.setItem(
                    `audionize_user_${sessionCode}`,
                    userName.trim()
                  );
                  setUserName(userName.trim());
                }
              }}
              disabled={!userName.trim()}
              className="mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 px-6 py-2 rounded text-white transition-colors"
            >
              Join Session
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Welcome, {userName}!
              </h3>
              <p className="text-slate-400">
                Waiting for host to start audio playback...
              </p>
            </div>

            {audioUrl ? (
              <div className="space-y-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => dispatch(setIsPlaying(true))}
                    onPause={() => dispatch(setIsPlaying(false))}
                    onError={(e) => {
                      console.error("Audio error:", e);
                      toast.error("Audio playback error");
                    }}
                    className="w-full"
                    controls
                    preload="metadata"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Progress
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime || 0}
                      onChange={handleSeek}
                      className="w-full accent-blue-500"
                      disabled={!audioUrl}
                    />
                    <div className="flex justify-between text-sm text-slate-400 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Volume
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      defaultValue="1"
                      onChange={handleVolumeChange}
                      className="w-full accent-blue-500"
                      disabled={!audioUrl}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-700/30 rounded-lg">
                <div className="text-slate-400 mb-2">
                  <svg
                    className="w-12 h-12 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  Waiting for Audio
                </h3>
                <p className="text-slate-400">
                  The host will upload audio to start the session
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="font-semibold mb-2">Connection Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="capitalize">{syncStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connected Clients:</span>
                  <span>{connectedClients.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
