"use client";
import { useState, useRef, useEffect } from "react";
import {
  useAuth,
  useSession as useSessionStore,
  useSync,
  useAppDispatch,
  useAppSelector,
} from "../store/hooks";
import { generateSessionCode } from "../store/slices/sessionSlice";
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
} from "../store/slices/syncSlice";
import { clearSession } from "../store/slices/sessionSlice";
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

  // Generate 6-digit session code
  const generateSessionCodeValue = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Generate session code if not exists
  if (!sessionCode) {
    const newCode = generateSessionCodeValue();
    dispatch(generateSessionCode(newCode));
  }

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
      if (data.type === "joined" && data.client && data.client.id) {
        if (!connectedClients.some((c) => c.id === data.client.id)) {
          dispatch(
            addConnectedClient({
              id: data.client.id,
              name: data.client.name,
              joinedAt: new Date().toISOString(),
            })
          );
          toast.success(`${data.client.name} joined the session`);
        }
      } else if (data.type === "left" && data.clientId) {
        if (connectedClients.some((c) => c.id === data.clientId)) {
          dispatch(removeConnectedClient(data.clientId));
          toast.success("A client left the session");
        }
      }
    });
  }, [setMessageHandler, setClientUpdateHandler, dispatch, connectedClients]);

  // Periodically broadcast host time for drift correction
  useEffect(() => {
    if (isPlaying && syncConnected) {
      const interval = setInterval(() => {
        sendTimeUpdate(currentTime);
      }, 2000); // every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isPlaying, syncConnected, currentTime, sendTimeUpdate]);

  // Audio upload handler
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
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

        // Convert blob to ArrayBuffer and send with file type
        const arrayBuffer = await blob.arrayBuffer();
        sendAudio(arrayBuffer, file.name, file.size, file.type);

        toast.success("Audio uploaded and shared with clients");
      } catch (error) {
        console.error("Error uploading audio:", error);
        toast.error("Failed to upload audio");
      }
    }
  };

  // Enhanced Audio Player Event Handlers with better timing
  const handlePlay = () => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    // Use the enhanced sync service timing
    const scheduledTime = Date.now() + 1000; // 1 second delay
    sendPlay(scheduledTime, currentTime);

    // Update local state immediately for responsive UI
    dispatch(setIsPlaying(true));
  };

  const handlePause = () => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    sendPause(currentTime);

    // Update local state immediately for responsive UI
    dispatch(setIsPlaying(false));
  };

  const handleSeek = (time) => {
    if (!syncConnected) {
      toast.error("Not connected to sync server yet. Please wait.");
      return;
    }

    sendSeek(time);

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

                      // Check real socket connection status
                      const socketConnected =
                        getConnectionStatus && getConnectionStatus();

                      if (response.type === "opaque" || response.ok) {
                        if (socketConnected) {
                          toast.success(
                            `Server is accessible and Socket.IO is CONNECTED.`
                          );
                          dispatch(setConnected(true));
                          dispatch(setSyncStatus("connected"));
                        } else {
                          toast.error(
                            `Server is accessible, but Socket.IO is NOT connected.`
                          );
                          dispatch(setConnected(false));
                          dispatch(setSyncStatus("disconnected"));
                        }
                      } else {
                        toast.error(
                          "Server health check failed. Please check if the server is running."
                        );
                        dispatch(setConnected(false));
                        dispatch(setSyncStatus("disconnected"));
                      }
                    } catch (error) {
                      toast.error(
                        "Connection test failed - server may be down"
                      );
                      dispatch(setConnected(false));
                      dispatch(setSyncStatus("disconnected"));
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

        {/* Audio Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Upload Audio File
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              if (!syncConnected) {
                toast.error("Not connected to sync server yet. Please wait.");
                return;
              }
              handleAudioUpload(e);
            }}
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!syncConnected}
          />
        </div>

        {/* Modern Audio Player */}
        {audioUrl ? (
          <div className="mb-6">
            <ModernAudioPlayer
              audioUrl={audioUrl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              isHost={true}
              disabled={!syncConnected} // <-- Only enable controls when socket is connected
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
