"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSessionCode, setIsClient } from "../store/slices/sessionSlice";
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
} from "../store/slices/syncSlice";
import { useSyncService } from "../hooks/useSyncService";
import ModernAudioPlayer from "./ModernAudioPlayer";
import NameInputModal from "./NameInputModal";
import LoadingState from "./LoadingState";
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

  // Only connect to sync service when both sessionCode and userName are set
  let setMessageHandler = null;
  let sendTimeUpdate = null;
  if (sessionCode && userName) {
    const syncService = useSyncService(sessionCode, "client", userName);
    setMessageHandler = syncService.setMessageHandler;
    sendTimeUpdate = syncService.sendTimeUpdate;
  }

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
      // Host started playback - client can choose to follow or not
      console.log("Host started playback");
      // Optionally auto-play for client (you can make this configurable)
      // dispatch(setIsPlaying(true));
      if (data.currentTime !== undefined) {
        dispatch(setCurrentTime(data.currentTime));
      }
    } else if (data.type === "pause") {
      // Host paused playback - client can choose to follow or not
      console.log("Host paused playback");
      // Optionally auto-pause for client (you can make this configurable)
      // dispatch(setIsPlaying(false));
    } else if (data.type === "seek") {
      // Host seeked to a position - client can choose to follow or not
      console.log("Host seeked to:", data.currentTime);
      if (data.currentTime !== undefined) {
        dispatch(setCurrentTime(data.currentTime));
      }
    } else if (data.type === "volume") {
      // Host changed volume - client can choose to follow or not
      console.log("Host changed volume:", data.volume);
      // Handle volume change if needed
    } else if (data.type === "sync_all") {
      // Host synced all clients - client can choose to follow or not
      console.log("Host synced all clients to:", data.currentTime);
      if (data.currentTime !== undefined) {
        dispatch(setCurrentTime(data.currentTime));
      }
      toast.success("Synced to host position");
    }
  };

  // Handle audio sync from server
  const handleAudioSync = (data) => {
    console.log("Received audio sync:", data);
    try {
      // Handle audio blob data
      if (data.audioBlob) {
        const audioBlob = new Blob([data.audioBlob], {
          type: "audio/mpeg",
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

  // Modern Audio Player Event Handlers (client has full control)
  const handlePlay = () => {
    // Client can control their own playback
    console.log("Client play event");
    dispatch(setIsPlaying(true));
  };

  const handlePause = () => {
    // Client can control their own playback
    console.log("Client pause event");
    dispatch(setIsPlaying(false));
  };

  const handleSeek = (time) => {
    // Client can control their own seeking
    console.log("Client seek event:", time);
    dispatch(setCurrentTime(time));
  };

  const handleVolumeChange = (volume) => {
    // Client can control their own volume
    console.log("Client volume changed:", volume);
  };

  // Handle name submission
  const handleNameSubmit = (name) => {
    setUserName(name);
    localStorage.setItem(`audionize_user_${sessionCode}`, name);
    setIsConnecting(true);

    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      dispatch(setConnected(true));
      dispatch(setSyncStatus("connected"));
    }, 1000);
  };

  // Set up message handler
  useEffect(() => {
    if (setMessageHandler && sessionCode && userName) {
      setMessageHandler(handleSync);
    }
  }, [setMessageHandler, sessionCode, userName]);

  // Set up audio update handler
  useEffect(() => {
    if (setMessageHandler && sessionCode && userName) {
      // This would be setAudioUpdateHandler if available
      // For now, we'll handle audio sync in the main message handler
    }
  }, [setMessageHandler, sessionCode, userName]);

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

  // Show name input if no username
  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <NameInputModal
          isOpen={true}
          onClose={() => {}} // Can't close, must enter name
          onSubmit={handleNameSubmit}
        />
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
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
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Client Session</h1>
          <p className="text-slate-300">
            Session: <span className="font-mono">{sessionCode}</span>
          </p>
          <p className="text-slate-400 text-sm">
            Connected as: <span className="font-medium">{userName}</span>
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-8">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isConnected
                ? "bg-green-500/20 text-green-300 border border-green-500/50"
                : "bg-red-500/20 text-red-300 border border-red-500/50"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            ></div>
            {isConnected ? "Connected to Host" : "Disconnected"}
          </div>
        </div>

        {/* Modern Audio Player */}
        {audioUrl ? (
          <div className="mb-8">
            <ModernAudioPlayer
              audioUrl={audioUrl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              isHost={false}
            />
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl">
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
              music player here once they begin. You'll have full control over
              play, pause, seek, and volume.
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
                  isConnected ? "text-green-400" : "text-red-400"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
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
              <span className="text-blue-400 font-medium">Full Control</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
