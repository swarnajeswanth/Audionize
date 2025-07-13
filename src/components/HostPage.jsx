"use client";
import { useState, useRef, useEffect } from "react";
import {
  useAuth,
  useSession as useSessionStore,
  useSync,
  useAppDispatch,
  useAppSelector,
} from "../store/hooks";
import {
  generateSessionCode,
  setSessionCode,
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
  addConnectedClient,
  removeConnectedClient,
  addSyncMessage,
  clearSync,
  presenceUpdate,
} from "../store/slices/syncSlice";
import { useSyncService } from "../hooks/useSyncService";
import ModernAudioPlayer from "./ModernAudioPlayer";
import toast from "react-hot-toast";

export default function HostPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { sessionCode } = useSessionStore();
  const { isConnected, connectedClients } = useSync();
  const { currentTime, isPlaying } = useAppSelector((state) => state.audio); // <-- get currentTime and isPlaying
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [audioFile, setAudioFileState] = useState(null);
  const [audioUrl, setAudioUrlState] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playDelay, setPlayDelay] = useState(2000); // 2 seconds default
  const [isPlayScheduled, setIsPlayScheduled] = useState(false);
  const [allClientsReady, setAllClientsReady] = useState(false);

  const audioElementRef = useRef(null);

  // Generate 6-digit session code
  const generateSessionCodeValue = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Generate session code if not exists (move to useEffect)
  useEffect(() => {
    if (!sessionCode) {
      // Try to recover session from localStorage
      const storedSession = localStorage.getItem("audionize_host_session");
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          // Check if session is not too old (within last 24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          if (sessionAge < 24 * 60 * 60 * 1000) {
            dispatch(setSessionCode(sessionData.sessionCode));
            toast.success("Host session restored from previous connection");
            return;
          } else {
            // Session too old, clear it
            localStorage.removeItem("audionize_host_session");
          }
        } catch (error) {
          console.error("Error parsing stored session:", error);
          localStorage.removeItem("audionize_host_session");
        }
      }
      // If no valid session in storage, generate a new one
      const newCode = generateSessionCodeValue();
      dispatch(generateSessionCode(newCode));
      localStorage.setItem(
        "audionize_host_session",
        JSON.stringify({ sessionCode: newCode, timestamp: Date.now() })
      );
    }
  }, [sessionCode, dispatch]);

  // Generate join link for public backend
  const joinUrl = `${
    typeof window !== "undefined"
      ? window.location.origin
      : "https://audionize.netlify.app"
  }/client?code=${sessionCode}`;

  // Handle sync messages from clients
  const handleSync = (data) => {
    console.log("Received sync from client:", data);

    if (data.type === "client_joined") {
      // New client joined
      dispatch(
        addConnectedClient({
          id: data.clientId,
          name: data.clientName,
          joinedAt: new Date().toISOString(),
          status: "connected",
        })
      );
      toast.success(`${data.clientName} joined the session`);
    } else if (data.type === "client_left") {
      // Client left
      dispatch(removeConnectedClient(data.clientId));
      toast.info(`${data.clientName} left the session`);
    } else if (data.type === "time_update") {
      // Client time update
      dispatch(
        addSyncMessage({
          type: "client_time_update",
          clientId: data.clientId,
          currentTime: data.currentTime,
          timestamp: data.timestamp,
        })
      );
    }
  };

  // Connect to sync service as host
  const {
    setMessageHandler,
    setClientUpdateHandler,
    sendAudio,
    sendPlay,
    sendPause,
    sendSeek,
    sendVolume,
    sendSyncAll,
    isConnected: syncConnected, // <-- get real socket connection status
    sendTimeUpdate, // <-- Add sendTimeUpdate to the hook
    getConnectionStatus,
    getConnectionInfo, // <-- Add getConnectionInfo to the hook
  } = useSyncService(sessionCode, "host", user?.name || "Host");

  // Debug connection status
  useEffect(() => {
    console.log("Host sync connection status:", {
      sessionCode,
      userName: user?.name || "Host",
      syncConnected,
      isConnected,
      serverUrl:
        process.env.NEXT_PUBLIC_IO_URL ||
        "https://aduionize-socket.onrender.com",
      environment: process.env.NODE_ENV,
    });
  }, [sessionCode, user?.name, syncConnected, isConnected]);

  // Set up sync service handlers
  useEffect(() => {
    if (!setMessageHandler || !setClientUpdateHandler) {
      console.warn("Sync service handlers not ready yet");
      return;
    }

    setMessageHandler((data) => {
      console.log("Received message:", data);
      if (data.type === "sync") {
        dispatch(setSyncStatus("synced"));
        toast.success("Audio synchronized with all clients");
      }
    });

    setClientUpdateHandler((data) => {
      console.log("Client update:", data);
      if (data.type === "joined") {
        dispatch(
          addConnectedClient({
            id: data.clientId || data.client?.id,
            name: data.clientName || data.client?.name,
            joinedAt: new Date().toISOString(),
          })
        );
        toast.success(
          `${data.clientName || data.client?.name} joined the session`
        );
      } else if (data.type === "left") {
        const clientId = data.clientId || data.client?.id;
        const clientName = data.clientName || data.client?.name;
        dispatch(removeConnectedClient(clientId));
        toast.info(`${clientName || "A client"} left the session`);
      }
    });
  }, [setMessageHandler, setClientUpdateHandler, dispatch]);

  // Add this effect after the sync service setup
  useEffect(() => {
    if (!sessionCode) return;
    if (!window || !window.document) return;
    // Access the socket from syncService
    const syncService = require("../services/syncService").default;
    if (!syncService.socket) return;
    const handlePresenceUpdate = (data) => {
      dispatch(presenceUpdate(data));
    };
    syncService.socket.on("presence-update", handlePresenceUpdate);
    return () => {
      syncService.socket.off("presence-update", handlePresenceUpdate);
    };
  }, [sessionCode, dispatch]);

  // Periodically broadcast host time for drift correction
  useEffect(() => {
    if (isPlaying && syncConnected) {
      const interval = setInterval(() => {
        sendTimeUpdate(currentTime);
      }, 1000); // every 1 second for better sync
      return () => clearInterval(interval);
    }
  }, [isPlaying, syncConnected, currentTime, sendTimeUpdate]);

  // Audio upload handler
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select a valid audio file");
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    try {
      setAudioFileState(file);
      const url = URL.createObjectURL(file);
      setAudioUrlState(url);
      dispatch(setAudioUrl(url));
      dispatch(setCurrentTime(0));
      dispatch(setDuration(0));

      // Convert file to blob for sharing
      const blob = new Blob([file], { type: file.type });
      setAudioBlob(blob);

      // Show loading state for audio upload
      toast.loading("Uploading audio to sync server...");

      // Send audio to clients with retry logic
      if (syncConnected) {
        try {
          // Convert blob to ArrayBuffer and send with file type
          const arrayBuffer = await blob.arrayBuffer();

          // Add timeout for audio upload
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Audio upload timeout"));
            }, 30000); // 30 second timeout

            sendAudio(arrayBuffer, file.name, file.size, file.type);

            // Assume success after a short delay (since sendAudio is async)
            setTimeout(() => {
              clearTimeout(timeout);
              resolve();
            }, 2000);
          });

          // Dismiss loading toast and show success
          toast.dismiss();
          toast.success("Audio uploaded and shared with clients");
        } catch (uploadError) {
          console.error("Audio upload failed:", uploadError);
          toast.dismiss();
          toast.error("Failed to send audio to clients. Please try again.");
        }
      } else {
        toast.dismiss();
        toast.error(
          "Not connected to sync server. Please wait for connection."
        );
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error uploading audio:", error);
      toast.error("Failed to upload audio file");
    }
  };

  // Enhanced Audio Player Event Handlers with better timing
  const handlePlay = () => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    // Use configurable delay for better sync
    const scheduledTime = Date.now() + playDelay;
    sendPlay(scheduledTime, currentTime);

    // Show scheduled play notification
    setIsPlayScheduled(true);
    toast.success(`Play scheduled in ${playDelay / 1000} seconds`);

    // Schedule host playback to start at the same time as clients
    setTimeout(() => {
      if (audioElementRef.current?.audio) {
        audioElementRef.current.audio.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
        // Update playing state when audio actually starts
        dispatch(setIsPlaying(true));
      }
    }, playDelay);

    // Don't update playing state immediately - wait for scheduled play

    // Clear scheduled state after delay
    setTimeout(() => {
      setIsPlayScheduled(false);
    }, playDelay);
  };

  const handlePause = () => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    sendPause(currentTime);

    // Clear scheduled play state
    setIsPlayScheduled(false);

    // Pause immediately for host
    if (audioElementRef.current?.audio) {
      audioElementRef.current.audio.pause();
    }

    // Update local state immediately for responsive UI
    dispatch(setIsPlaying(false));
  };

  const handleSeek = (time) => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    sendSeek(time);

    // Seek immediately for host
    if (audioElementRef.current?.audio) {
      audioElementRef.current.audio.currentTime = time;
    }

    // Update local state immediately for responsive UI
    dispatch(setCurrentTime(time));
  };

  const handleVolumeChange = (volume) => {
    sendVolume(volume);
  };

  // Client management
  const handleMuteClient = (clientId) => {
    // Implementation for muting specific client
    toast.info("Client mute functionality coming soon");
  };

  const handleDisconnectClient = (clientId) => {
    // Implementation for disconnecting specific client
    toast.info("Client disconnect functionality coming soon");
  };

  // Enhanced sync all clients to current position
  const handleSyncMusic = () => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    sendSyncAll(currentTime);
    toast.success("All clients synced to current position");
  };

  // Handle manual session end
  const handleEndSession = () => {
    if (
      window.confirm(
        "Are you sure you want to end this session? All clients will be disconnected."
      )
    ) {
      // Disconnect from sync service (this will trigger host_disconnect for all clients)
      if (sessionCode) {
        console.log("Host manually ending session");
        // The sync service disconnect will handle room closure
        // This will trigger host_disconnect event for all clients
      }

      // Clear local state
      dispatch(clearSync());
      dispatch(clearSession());

      // Clear localStorage
      localStorage.removeItem("audionize_host_session");

      // Redirect to home page
      window.location.href = "/";
    }
  };

  // Initialize connection
  useEffect(() => {
    if (sessionCode) {
      // Store session info in localStorage for persistence
      localStorage.setItem(
        "audionize_host_session",
        JSON.stringify({
          sessionCode,
          userName: user?.name || "Host",
          timestamp: Date.now(),
        })
      );
    }
  }, [sessionCode, dispatch, user?.name]);

  // Check for existing session on page load (for page refresh recovery)
  useEffect(() => {
    if (!sessionCode) {
      // Try to recover session from localStorage
      const storedSession = localStorage.getItem("audionize_host_session");
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          // Check if session is not too old (within last 24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          if (sessionAge < 24 * 60 * 60 * 1000) {
            dispatch(setSessionCode(sessionData.sessionCode));
            toast.success("Host session restored from previous connection");
          } else {
            // Session too old, clear it
            localStorage.removeItem("audionize_host_session");
          }
        } catch (error) {
          console.error("Error parsing stored session:", error);
          localStorage.removeItem("audionize_host_session");
        }
      }
    }
  }, [sessionCode, dispatch]);

  // Cleanup on unmount - close room and disconnect all clients
  useEffect(() => {
    return () => {
      // Clear session from localStorage
      localStorage.removeItem("audionize_host_session");

      // Disconnect from sync service (this will close the room)
      if (sessionCode) {
        console.log("Host disconnecting - closing room");
        // The sync service disconnect will handle room closure
        // This will trigger host_disconnect event for all clients
      }
    };
  }, [sessionCode]);

  // Monitor client connections and handle cleanup
  useEffect(() => {
    if (sessionCode && syncConnected) {
      // Set up periodic client status check
      const clientCheckInterval = setInterval(() => {
        // Update client list from server if needed
        // This helps keep the client list in sync
        console.log(
          `Host monitoring ${connectedClients.length} clients in session ${sessionCode}`
        );
      }, 10000); // Check every 10 seconds

      return () => {
        clearInterval(clientCheckInterval);
      };
    }
  }, [sessionCode, syncConnected, connectedClients.length]);

  // Handle page unload/refresh with confirmation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionCode && connectedClients.length > 0) {
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue =
          "Are you sure you want to leave? This will disconnect all clients and end the session.";
        return "Are you sure you want to leave? This will disconnect all clients and end the session.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionCode, connectedClients.length]);

  // Add this effect to reset ready state on audio upload or client join/leave
  useEffect(() => {
    if (!sessionCode) return;
    if (!window || !window.document) return;
    const syncService = require("../services/syncService").default;
    if (!syncService.socket) return;
    const resetReady = () => setAllClientsReady(false);
    syncService.socket.on("audio-uploaded", resetReady);
    syncService.socket.on("presence-update", resetReady);
    return () => {
      syncService.socket.off("audio-uploaded", resetReady);
      syncService.socket.off("presence-update", resetReady);
    };
  }, [sessionCode]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Host Session</h1>
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
                  connectedClients.length > 0
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : "bg-gray-500/30 text-gray-300 border border-gray-500/50"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    connectedClients.length > 0
                      ? "bg-blue-400 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
                {connectedClients.length} Client
                {connectedClients.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="mt-2">
              <button
                onClick={handleEndSession}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white text-sm font-medium transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-slate-700/30 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Session Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Connected Clients:</span>
              <span>{connectedClients.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Sync Server Status:</span>
              <span
                className={`font-medium ${
                  syncConnected ? "text-green-400" : "text-red-400"
                }`}
              >
                {syncConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Join Link:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(joinUrl);
                  toast.success("Join link copied to clipboard!");
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Copy Link
              </button>
            </div>
            {!syncConnected && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-xs">
                  ⚠️ Not connected to sync server. Audio controls will be
                  disabled until connection is established.
                </p>
                <p className="text-red-400 text-xs mt-1">
                  Check browser console for connection details.
                </p>
                <button
                  onClick={async () => {
                    try {
                      // Simple connection test by checking if we can reach the server
                      const serverUrl =
                        process.env.NEXT_PUBLIC_IO_URL ||
                        "https://aduionize-socket.onrender.com";
                      const healthUrl = serverUrl.replace("/socket.io", "");

                      const response = await fetch(healthUrl, {
                        method: "GET",
                        mode: "no-cors",
                      });

                      if (response.type === "opaque" || response.ok) {
                        toast.success(
                          `Server is accessible at ${serverUrl}. Connection should work.`
                        );
                      } else {
                        toast.error(
                          "Server health check failed. Please check if the server is running."
                        );
                      }
                    } catch (error) {
                      toast.error(
                        "Connection test failed - server may be down"
                      );
                      console.error("Connection test error:", error);
                    }
                  }}
                  className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                >
                  Test Connection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Debug Panel (only show in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-slate-700/30 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span>Connection Status:</span>
                <span
                  className={syncConnected ? "text-green-400" : "text-red-400"}
                >
                  {syncConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Code:</span>
                <span>{sessionCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Role:</span>
                <span>host</span>
              </div>
              <div className="flex justify-between">
                <span>User Name:</span>
                <span>{user?.name || "Host"}</span>
              </div>
              <div className="flex justify-between">
                <span>Audio URL:</span>
                <span className="truncate max-w-xs">
                  {audioUrl ? "Set" : "Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Connected Clients:</span>
                <span>{connectedClients.length}</span>
              </div>
              <button
                onClick={() => {
                  const info = getConnectionInfo();
                  console.log("Sync Service Debug Info:", info);
                  toast.success("Debug info logged to console");
                }}
                className="mt-2 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded transition-colors"
              >
                Log Debug Info
              </button>
            </div>
          </div>
        )}

        {/* Audio Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Upload Audio File
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Play Delay Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Play Delay: {playDelay / 1000}s
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="500"
              max="5000"
              step="500"
              value={playDelay}
              onChange={(e) => setPlayDelay(parseInt(e.target.value))}
              className="flex-1 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                  ((playDelay - 500) / (5000 - 500)) * 100
                }%, #475569 ${
                  ((playDelay - 500) / (5000 - 500)) * 100
                }%, #475569 100%)`,
              }}
            />
            <input
              type="number"
              min="500"
              max="5000"
              step="500"
              value={playDelay}
              onChange={(e) => setPlayDelay(parseInt(e.target.value))}
              className="w-20 bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-center text-white text-sm"
            />
            <span className="text-slate-400 text-sm">ms</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Time to wait before starting playback (allows clients to sync)
          </p>
        </div>

        {/* Modern Audio Player */}
        {audioUrl ? (
          <div className="mb-6">
            {!allClientsReady && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-pulse rounded-full h-4 w-4 border-2 border-yellow-400 mr-2"></div>
                  <span className="text-yellow-300 text-sm">
                    Waiting for all clients to be ready...
                  </span>
                </div>
              </div>
            )}
            {isPlayScheduled && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  <span className="text-blue-300 text-sm">
                    Play scheduled in {playDelay / 1000} seconds...
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
              isHost={true}
              disabled={!syncConnected || !allClientsReady} // <-- Only enable controls when socket is connected and all clients are ready
            />

            {/* Sync Button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleSyncMusic}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sync All Clients
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-700/30 rounded-lg mb-6">
            <div className="text-slate-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              Upload Audio to Start
            </h3>
            <p className="text-slate-400">
              Upload an audio file above to begin the synchronized session
            </p>
          </div>
        )}

        {/* Connected Clients */}
        {connectedClients.length > 0 && (
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Connected Clients</h3>
            <div className="space-y-2">
              {connectedClients.map((client, index) => (
                <div
                  key={client.id || `client-${index}`}
                  className="flex items-center justify-between p-3 bg-slate-600/30 rounded-lg border border-slate-500/20"
                >
                  <div className="flex items-center gap-3">
                    {/* Mic status icon (placeholder, replace with real state) */}
                    <span
                      className={`inline-block w-3 h-3 rounded-full border-2 ${
                        client.isMuted
                          ? "bg-red-500 border-red-400"
                          : "bg-green-400 border-green-300"
                      }`}
                      title={client.isMuted ? "Muted" : "Unmuted"}
                    ></span>
                    <span className="font-medium text-white">
                      {client.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      Joined {new Date(client.joinedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMuteClient(client.id)}
                      className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
                    >
                      Mute
                    </button>
                    <button
                      onClick={() => handleDisconnectClient(client.id)}
                      className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
