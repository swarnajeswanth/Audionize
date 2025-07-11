"use client";
import { useState, useRef, useEffect } from "react";
import {
  useAuth,
  useSession as useSessionStore,
  useSync,
  useAppDispatch,
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
} from "../store/slices/syncSlice";
import { useSyncService } from "../hooks/useSyncService";
import toast from "react-hot-toast";

export default function HostPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { sessionCode } = useSessionStore();
  const { isConnected, connectedClients } = useSync();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [audioFile, setAudioFileState] = useState(null);
  const [audioUrl, setAudioUrlState] = useState(null);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(1);
  const [audioBlob, setAudioBlob] = useState(null);
  const audioRef = useRef();

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
  } = useSyncService(sessionCode, "host", user?.name || "Host");

  // Set up message handlers
  useEffect(() => {
    setMessageHandler(handleSync);
    setClientUpdateHandler((data) => {
      if (data.type === "joined") {
        dispatch(
          addConnectedClient({
            id: data.client.clientId,
            name: data.client.clientName,
            joinedAt: new Date().toISOString(),
            status: "connected",
          })
        );
        toast.success(`${data.client.clientName} joined the session`);
      } else if (data.type === "left") {
        dispatch(removeConnectedClient(data.clientId));
        toast.info("A client left the session");
      }
    });
  }, [setMessageHandler, setClientUpdateHandler, dispatch]);

  // Audio upload handler
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFileState(file);
      const url = URL.createObjectURL(file);
      setAudioUrlState(url);
      setCurrentTimeState(0);
      setDurationState(0);

      // Convert file to blob for sharing
      const blob = new Blob([file], { type: file.type });
      setAudioBlob(blob);

      // Send audio to all clients
      const arrayBuffer = await file.arrayBuffer();
      sendAudio(arrayBuffer, file.name, file.size);

      toast.success("Audio uploaded and shared with clients");
    }
  };

  // Player controls
  const handlePlay = () => {
    setIsPlayingState(true);
    dispatch(setIsPlaying(true));
    if (audioRef.current) {
      audioRef.current.play();

      // Send play command to all clients
      sendPlay(audioRef.current.currentTime);
    }
  };

  const handlePause = () => {
    setIsPlayingState(false);
    dispatch(setIsPlaying(false));
    if (audioRef.current) {
      audioRef.current.pause();

      // Send pause command to all clients
      sendPause();
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTimeState(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;

      // Send seek command to all clients
      sendSeek(time);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTimeState(time);
      dispatch(setCurrentTime(time));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration || 0;
      setDurationState(dur);
      dispatch(setDuration(dur));
    }
  };

  // Volume control
  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setPlayerVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;

      // Send volume change to all clients
      sendVolume(vol);
    }
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

  // Sync all clients to current position
  const handleSyncMusic = () => {
    if (audioRef.current) {
      sendSyncAll(audioRef.current.currentTime);
      toast.success("All clients synced to current position");
    }
  };

  // Initialize connection
  useEffect(() => {
    if (sessionCode) {
      dispatch(setConnected(true));
      dispatch(setSyncStatus("connected"));
    }
  }, [sessionCode, dispatch]);

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
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? "bg-green-400" : "bg-red-400"
                }`}
              ></div>
              {isConnected ? "Connected" : "Disconnected"}
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
            onChange={handleAudioUpload}
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="space-y-4 mb-6">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              className="w-full"
              controls
            />

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
                  value={playerVolume}
                  onChange={handleVolumeChange}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSyncMusic}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white text-sm transition-colors"
              >
                Sync All Clients
              </button>
            </div>
          </div>
        )}

        {/* Connected Clients */}
        {connectedClients.length > 0 && (
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Connected Clients</h3>
            <div className="space-y-2">
              {connectedClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 bg-slate-600/30 rounded"
                >
                  <div>
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      Joined {new Date(client.joinedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMuteClient(client.id)}
                      className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded hover:bg-yellow-500/30"
                    >
                      Mute
                    </button>
                    <button
                      onClick={() => handleDisconnectClient(client.id)}
                      className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30"
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

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
