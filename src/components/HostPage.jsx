"use client";
import { useEffect, useState, useRef } from "react";

import { useLanSync } from "../hooks/useLanSync";
import { useInternetSync } from "../hooks/useInternetSync";
import toast from "react-hot-toast";
import { getPrivateIp } from "../utils/getPrivateIp";
import { getPublicIp } from "../utils/getPublicIp";
import {
  useAuth,
  useSession as useSessionStore,
  useAudio,
  useSync,
  useAppDispatch,
  useSelector,
} from "../store/hooks";
import {
  setPrivateIp,
  setPublicIp,
  generateSessionCode,
  setMode,
} from "../store/slices/sessionSlice";
import {
  setAudioFile,
  setAudioUrl,
  setPlaying,
  setCurrentTime,
  setDuration,
  play,
  pause,
  seekTo,
} from "../store/slices/audioSlice";
import {
  setConnected,
  setSyncStatus,
  addConnectedClient,
  setIsHost,
  setMuted,
  setSyncStatusForClient,
} from "../store/slices/syncSlice";
import { useLoadingState } from "../hooks/useLoadingState";
import LoadingState from "./LoadingState";
import VoiceChat from "./VoiceChat";
import voiceChatService from "../services/voiceChatService";
import AnimatedModal from "./AnimatedModal";
import FeatureSelectionModal from "./FeatureSelectionModal";

export default function HostPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { sessionCode, mode, privateIp, publicIp } = useSessionStore();
  const { audioFile, audioUrl, isPlaying, currentTime, duration } = useAudio();
  const { isConnected, connectedClients } = useSync();
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const waveformRef = useRef();
  const audioRef = useRef();
  const hasShownInitialConnection = useRef(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [connectivityType, setConnectivityType] = useState("lan");
  const [showFeatureModal, setShowFeatureModal] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Generate 6-digit LAN code
  const generateLANCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const lanCode = sessionCode || generateLANCode();
  const internetLink = `https://your-domain.com/join?session=${sessionCode}&ip=${publicIp}`;

  // Handle feature selection
  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
    dispatch(setMode(feature));

    // Generate session code if not exists
    if (!sessionCode) {
      const newCode = generateLANCode();
      dispatch(generateSessionCode(newCode));
    }

    // Sync services will automatically connect when sessionCode and mode are set
    toast.success(`${feature.toUpperCase()} session started!`);
  };

  // Loading states
  const ipDetectionState = useLoadingState();
  const audioUploadState = useLoadingState();

  useEffect(() => {
    if (typeof window !== "undefined") {
      ipDetectionState.startLoading("Detecting network...");

      // Get IP addresses with error handling
      Promise.all([
        getPrivateIp().catch((error) => {
          console.warn("Failed to get private IP:", error);
          return "localhost";
        }),
        getPublicIp().catch((error) => {
          console.warn("Failed to get public IP:", error);
          return "your-public-ip.com";
        }),
      ])
        .then(([privateIp, publicIp]) => {
          dispatch(setPrivateIp(privateIp));
          dispatch(setPublicIp(publicIp));
          ipDetectionState.setSuccess("Network detected");
        })
        .catch((error) => {
          ipDetectionState.setError(error, "Network detection failed");
        });
    }
  }, [dispatch]);

  // Authentication is handled by middleware, so if we reach here, user is authenticated

  // Sync hooks
  const lanSync = useLanSync(sessionCode, "host", (data) =>
    setLog((l) => [...l, `[LAN] ${JSON.stringify(data)}`])
  );
  const internetSync = useInternetSync(sessionCode, "host", (data) =>
    setLog((l) => [...l, `[Internet] ${JSON.stringify(data)}`])
  );
  const sendSync = mode === "lan" ? lanSync.sendSync : internetSync.sendSync;

  useEffect(() => {
    if (!waveformRef.current) return;
    const container = waveformRef.current;
    container.innerHTML = "";
    const width = container.offsetWidth || 320;
    const barCount = Math.floor(width / 6);
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className =
        "absolute bottom-0 bg-gradient-to-t from-blue-500 to-purple-500 rounded w-1";
      bar.style.left = `${i * 6}px`;
      bar.style.width = "4px";
      bar.style.height = `${Math.random() * 80 + 20}px`;
      container.appendChild(bar);
      bars.push(bar);
    }
    return () => {
      container.innerHTML = "";
    };
  }, [audioFile]);

  useEffect(() => {
    if (!audioFile) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [audioFile]);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      dispatch(setAudioUrl(url));
      return () => URL.revokeObjectURL(url);
    } else {
      dispatch(setAudioUrl(null));
    }
  }, [audioFile, dispatch]);

  // Broadcast playback state
  const broadcast = (type, time) => {
    sendSync({ type, time });
  };

  // Periodically broadcast current time for drift correction
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        broadcast("sync", audioRef.current.currentTime);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle play/pause/seek events
  const handlePlay = () => {
    dispatch(play());
    broadcast("play", audioRef.current.currentTime);
    audioRef.current.play();
    broadcastPlayback("play", audioRef.current.currentTime);
  };
  const handlePause = () => {
    dispatch(pause());
    broadcast("pause", audioRef.current.currentTime);
    audioRef.current.pause();
    broadcastPlayback("pause", audioRef.current.currentTime);
  };
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    dispatch(seekTo(time));
    audioRef.current.currentTime = time;
    broadcast("seek", time);
    audioRef.current.play(); // Ensure playback resumes after seek
    broadcastPlayback("seek", time);
  };

  // Ensure playback resumes after receiving a sync event if isPlaying is true
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play();
    }
  }, [isPlaying, currentTime]);

  // Update currentTime as audio plays
  useEffect(() => {
    if (!audioRef.current) return;
    const onTimeUpdate = () =>
      dispatch(setCurrentTime(audioRef.current.currentTime));
    audioRef.current.addEventListener("timeupdate", onTimeUpdate);
    return () =>
      audioRef.current.removeEventListener("timeupdate", onTimeUpdate);
  }, [audioUrl, dispatch]);

  // Update duration when metadata loads
  useEffect(() => {
    if (!audioRef.current) return;
    const onLoaded = () =>
      dispatch(setDuration(audioRef.current.duration || 0));
    audioRef.current.addEventListener("loadedmetadata", onLoaded);
    return () =>
      audioRef.current.removeEventListener("loadedmetadata", onLoaded);
  }, [audioUrl, dispatch]);

  // Track device connections using Redux state
  useEffect(() => {
    // Set as host when component mounts
    dispatch(setIsHost(true));

    // Simulate initial connection (in real app, this would come from WebSocket/WebRTC)
    // For now, we'll simulate a device connecting after a short delay
    const timer = setTimeout(() => {
      if (!isConnected) {
        dispatch(setConnected(true));
        dispatch(setSyncStatus("connected"));
        dispatch(
          addConnectedClient({
            id: "demo-client-1",
            name: "Demo Device",
            status: "connected",
            currentTime: 0,
            drift: 0,
            lastUpdate: new Date().toISOString(),
          })
        );
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      dispatch(setIsHost(false));
    };
  }, [dispatch, isConnected]);

  // Handle actual device connections - only show toast for new connections
  useEffect(() => {
    // Track previous client count to detect new connections
    const previousClientCount = hasShownInitialConnection.current;

    if (connectedClients.length > previousClientCount) {
      // New device connected
      const newClient = connectedClients[connectedClients.length - 1];
      toast.success(`${newClient.name} connected`);
    }

    // Update the ref to current count
    hasShownInitialConnection.current = connectedClients.length;
  }, [connectedClients.length]);

  // Sync status updates (no toasts for these - they're shown in the UI)
  useEffect(() => {
    // In a real app, you'd update sync status here
    // For now, we just track the state without showing toasts
  }, [isPlaying, currentTime, audioFile]);

  // Notify if all clients are synced (simulate for now)
  // In a real app, track client sync status from server
  // toast.success("All devices synced");
  // toast.error("Some devices out of sync");

  // Audio upload handler
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      dispatch(setAudioFile(file));
      const url = URL.createObjectURL(file);
      dispatch(setAudioUrl(url));
      voiceChatService.sendMessage({
        type: "audio_file_update",
        url,
        name: file.name,
        size: file.size,
        mime: file.type,
      });
    }
  };

  // Modern player controls
  const [playerVolume, setPlayerVolume] = useState(1);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = playerVolume;
  }, [playerVolume]);

  // Sync Music button handler
  const handleSyncMusic = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      voiceChatService.sendMessage({
        type: "sync_and_play",
        time,
      });
      toast.success("Sync command sent to all devices!");
    }
  };

  // Broadcast playback state
  const broadcastPlayback = (action, time) => {
    voiceChatService.sendMessage({
      type: "playback_update",
      action,
      time,
    });
  };

  const handleMuteClient = (userId) => {
    dispatch(
      setMuted({
        userId,
        isMuted: !connectedClients.find((c) => c.userId === userId)?.isMuted,
      })
    );
    toast.success(
      `${
        connectedClients.find((c) => c.userId === userId)?.name || userId
      } muted`
    );
  };

  const handleDisconnectClient = (userId) => {
    if (
      window.confirm(
        `Are you sure you want to disconnect ${
          connectedClients.find((c) => c.userId === userId)?.name || userId
        }?`
      )
    ) {
      dispatch(setConnected(false));
      dispatch(setSyncStatus("disconnected"));
      dispatch(
        addConnectedClient({
          id: userId,
          name:
            connectedClients.find((c) => c.userId === userId)?.name || userId,
          status: "disconnected",
          currentTime: 0,
          drift: 0,
          lastUpdate: new Date().toISOString(),
        })
      );
      toast.success(
        `${
          connectedClients.find((c) => c.userId === userId)?.name || userId
        } disconnected`
      );
    }
  };

  // Show connectivity selection modal immediately after login if mode is not set
  useEffect(() => {
    if (!mode) {
      setShowInviteModal(false);
    } else {
      setShowInviteModal(true);
    }
  }, [mode]);

  // Connectivity type selection modal
  if (!mode) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl text-center">
          <h2 className="text-xl font-bold mb-4 text-white">
            Select Connectivity Type
          </h2>
          <div className="flex gap-6 justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
              onClick={() => dispatch(setMode("lan"))}
            >
              LAN (Local Network)
            </button>
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold"
              onClick={() => dispatch(setMode("internet"))}
            >
              Internet (Public)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check for missing connectivity info
  const hasPublicIP =
    publicIp &&
    publicIp !== "Not detected" &&
    !publicIp.includes("your-public-ip");
  const hasLANCode = sessionCode && sessionCode !== "Not detected";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Host Session
      </h1>

      {/* Feature Selection Modal */}
      <FeatureSelectionModal
        isOpen={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        onSelect={handleFeatureSelect}
      />

      {/* Show content only after feature selection */}
      {selectedFeature && (
        <>
          {/* Connection Status */}
          <LoadingState
            loading={ipDetectionState.loading}
            error={ipDetectionState.error}
            success={ipDetectionState.success}
            size="small"
          >
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl mb-6">
              <h2 className="text-xl font-semibold mb-4 text-white">
                {selectedFeature === "lan"
                  ? "LAN Connection"
                  : "Internet Connection"}
              </h2>

              {selectedFeature === "lan" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">LAN Code:</span>
                    <span className="text-2xl font-mono bg-slate-900 px-4 py-2 rounded text-blue-300">
                      {lanCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Network:</span>
                    <span className="text-slate-300">
                      {privateIp || "Detecting..."}
                    </span>
                  </div>

                  {(!privateIp || privateIp === "localhost") && (
                    <div className="mt-2 p-2 bg-yellow-900/30 rounded text-xs text-yellow-200">
                      <strong>LAN IP not detected?</strong> Try:
                      <ul className="mt-1 ml-4 list-disc">
                        <li>Check if you're on the same WiFi network</li>
                        <li>Allow camera/microphone permissions</li>
                        <li>Try refreshing the page</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Public IP:</span>
                    <span className="text-slate-300">
                      {publicIp || "Detecting..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Session ID:</span>
                    <span className="text-slate-300">{sessionCode}</span>
                  </div>

                  {!hasPublicIP && (
                    <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-200">
                      <strong>Public IP not detected!</strong> Internet sharing
                      may not work.
                    </div>
                  )}
                </div>
              )}
            </div>
          </LoadingState>

          {/* Connection Info Section */}
          <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl mb-6">
            <h3 className="text-lg font-semibold mb-4 text-white">
              {selectedFeature === "lan"
                ? "LAN Connection"
                : "Internet Connection"}
            </h3>

            <div className="flex flex-col gap-4">
              {selectedFeature === "lan" ? (
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">
                    Share this code with others on the same network:
                  </p>
                  <div className="bg-white text-black font-mono text-2xl font-bold p-4 rounded-lg mb-3">
                    {lanCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lanCode);
                      toast.success("LAN code copied!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
                  >
                    Copy Code
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">
                    Share this link with others to join via internet:
                  </p>
                  <div className="bg-white text-black font-mono text-sm p-3 rounded-lg mb-3 break-all">
                    {internetLink}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(internetLink);
                      toast.success("Internet link copied!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audio Upload & Player Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload Audio
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {audioFile && (
              <div className="mt-2 text-slate-300 text-xs">
                <span className="font-semibold">File:</span> {audioFile.name}{" "}
                <span className="ml-2">
                  ({Math.round(audioFile.size / 1024)} KB)
                </span>
              </div>
            )}
            {audioUrl && (
              <div className="mt-4 bg-slate-900/60 rounded-lg p-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  className="w-full mb-2"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeeked={(e) =>
                    handleSeek({
                      target: { value: audioRef.current.currentTime },
                    })
                  }
                  onTimeUpdate={() =>
                    dispatch(setCurrentTime(audioRef.current.currentTime))
                  }
                  onLoadedMetadata={() =>
                    dispatch(setDuration(audioRef.current.duration || 0))
                  }
                />
                <div className="flex items-center gap-4 mb-2">
                  <button
                    onClick={handlePlay}
                    disabled={isPlaying}
                    className="bg-blue-500 hover:bg-blue-600 rounded-full p-2 text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handlePause}
                    disabled={!isPlaying}
                    className="bg-slate-600 hover:bg-slate-700 rounded-full p-2 text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-blue-500"
                  />
                  <span className="text-xs text-slate-400">
                    {Math.floor(currentTime / 60)}:
                    {String(Math.floor(currentTime % 60)).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-slate-400">
                    / {Math.floor(duration / 60)}:
                    {String(Math.floor(duration % 60)).padStart(2, "0")}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={playerVolume}
                    onChange={(e) => setPlayerVolume(Number(e.target.value))}
                    className="w-24 accent-blue-500"
                    title="Volume"
                  />
                </div>
                <button
                  className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold shadow"
                  onClick={handleSyncMusic}
                >
                  Sync Music
                </button>
              </div>
            )}
          </div>

          {/* Device List with Sync Status */}
          <div className="mt-6">
            <h4 className="text-white font-medium mb-2">Connected Devices</h4>
            {connectedClients.length === 0 ? (
              <p className="text-gray-400 text-sm">No devices connected</p>
            ) : (
              <div className="space-y-2">
                {connectedClients.map((client, idx) => (
                  <div
                    key={client.userId || idx}
                    className="flex items-center space-x-3 bg-slate-800/60 rounded p-2"
                  >
                    {/* Sync status indicator */}
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{
                        background:
                          client.syncStatus === "in-sync"
                            ? "#22c55e"
                            : client.syncStatus === "drift"
                            ? "#facc15"
                            : "#ef4444",
                      }}
                      title={client.syncStatus || "unknown"}
                    ></div>
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium">
                        {client.name || client.userId}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {client.syncStatus || "unknown"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleMuteClient(client.userId)}
                      className={`px-2 py-1 rounded text-xs ${
                        client.isMuted
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {client.isMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={() => handleDisconnectClient(client.userId)}
                      className="px-2 py-1 rounded text-xs bg-red-700 text-white"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Voice Chat Component */}
      {selectedFeature && (
        <VoiceChat sessionCode={sessionCode} mode={selectedFeature} />
      )}
    </div>
  );
}
