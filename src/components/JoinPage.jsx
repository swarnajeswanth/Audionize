import { useState, useEffect, useRef } from "react";
import { useLanSync } from "../hooks/useLanSync";
import { useInternetSync } from "../hooks/useInternetSync";
import toast from "react-hot-toast";

export default function JoinPage() {
  const [showDiscovered, setShowDiscovered] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [mode, setMode] = useState("lan"); // 'lan' or 'internet'
  const [log, setLog] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncStatus, setSyncStatus] = useState("Idle");
  const audioRef = useRef();

  // Check for session code and mode in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("session");
      const urlMode = params.get("mode");
      if (code) {
        setSessionCode(code);
        setPermissionPrompt(true);
      }
      if (urlMode === "internet" || urlMode === "lan") {
        setMode(urlMode);
      }
    }
  }, []);

  // Simulate permission request
  const handlePermission = async () => {
    try {
      const audio = new window.Audio();
      audio.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; // silent
      await audio.play();
      setPermissionPrompt(false);
      setJoined(true);
    } catch (e) {
      setPermissionPrompt(false);
      setPermissionDenied(true);
    }
  };

  // Sync hooks
  const lanSync = useLanSync(sessionCode, "client", (data) =>
    setLog((l) => [...l, `[LAN] ${JSON.stringify(data)}`])
  );
  const internetSync = useInternetSync(sessionCode, "client", (data) =>
    setLog((l) => [...l, `[Internet] ${JSON.stringify(data)}`])
  );
  const syncActive = joined && sessionCode;
  const logToShow = log.slice(-5);

  // Handle sync messages
  useEffect(() => {
    if (!syncActive) return;
    const handleSync = (data) => {
      if (data.audioUrl && data.audioUrl !== audioUrl) {
        setAudioUrl(data.audioUrl);
      }
      if (!audioRef.current) return;
      if (data.type === "play") {
        setIsPlaying(true);
        setCurrentTime(data.time);
        audioRef.current.currentTime = data.time;
        audioRef.current.play();
        setSyncStatus("Playing");
      } else if (data.type === "pause") {
        setIsPlaying(false);
        setCurrentTime(data.time);
        audioRef.current.currentTime = data.time;
        audioRef.current.pause();
        setSyncStatus("Paused");
      } else if (data.type === "seek") {
        setCurrentTime(data.time);
        audioRef.current.currentTime = data.time;
        setSyncStatus("Seeked");
      } else if (data.type === "sync") {
        // Drift correction
        const drift = Math.abs(audioRef.current.currentTime - data.time);
        if (drift > 0.1) {
          audioRef.current.currentTime = data.time;
          setSyncStatus(`Resynced (${Math.round(drift * 1000)}ms drift)`);
        } else {
          setSyncStatus("Synced");
        }
      }
    };
    const sub = mode === "lan" ? lanSync : internetSync;
    sub.setOnMessage && sub.setOnMessage(handleSync);
    return () => {
      sub.setOnMessage && sub.setOnMessage(null);
    };
  }, [syncActive, mode, lanSync, internetSync, audioUrl]);

  // Update currentTime as audio plays
  useEffect(() => {
    if (!audioRef.current) return;
    const onTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);
    audioRef.current.addEventListener("timeupdate", onTimeUpdate);
    return () =>
      audioRef.current.removeEventListener("timeupdate", onTimeUpdate);
  }, [audioUrl]);

  // Update duration when metadata loads
  useEffect(() => {
    if (!audioRef.current) return;
    const onLoaded = () => setDuration(audioRef.current.duration || 0);
    audioRef.current.addEventListener("loadedmetadata", onLoaded);
    return () =>
      audioRef.current.removeEventListener("loadedmetadata", onLoaded);
  }, [audioUrl]);

  // Notify on connection
  useEffect(() => {
    if (syncActive) toast.success("Connected to host");
  }, [syncActive]);

  // Notify on sync status changes
  useEffect(() => {
    if (!syncActive) return;
    if (syncStatus.startsWith("Resynced")) toast("Resynced with host");
    else if (syncStatus === "Synced") toast.success("Playback in sync");
    else if (syncStatus === "Playing") toast("Playback started");
    else if (syncStatus === "Paused") toast("Playback paused");
    else if (syncStatus === "Seeked") toast("Seeked");
  }, [syncStatus, syncActive]);

  // UI rendering
  if (permissionPrompt) {
    return (
      <div className="max-w-2xl mx-auto mt-24 bg-slate-800/80 border border-white/10 p-8 rounded-xl flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Allow Audio Playback
        </h2>
        <p className="text-slate-300 mb-6 text-center">
          To join the session and play audio in sync, please allow audio
          playback on your device.
        </p>
        <button
          className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded text-white font-semibold"
          onClick={handlePermission}
        >
          Allow Audio
        </button>
      </div>
    );
  }
  if (permissionDenied) {
    return (
      <div className="max-w-2xl mx-auto mt-24 bg-slate-800/80 border border-white/10 p-8 rounded-xl flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-4 text-center text-red-400">
          Permission Denied
        </h2>
        <p className="text-slate-300 mb-6 text-center">
          Audio playback permission is required to join and sync with the
          session. Please refresh and allow permission.
        </p>
      </div>
    );
  }
  if (syncActive) {
    // Start sync connection
    mode === "lan" ? lanSync : internetSync;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Connected to Session</h2>
              <p className="text-slate-400">Session Code: {sessionCode}</p>
              <p className="text-xs text-slate-400">
                Mode: {mode.toUpperCase()}
              </p>
            </div>
            <button
              className="text-red-400 hover:text-red-300 flex items-center"
              onClick={() => setJoined(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Leave
            </button>
          </div>
          {/* Audio player and sync status */}
          {audioUrl ? (
            <>
              <audio ref={audioRef} src={audioUrl} className="w-full mb-2" />
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={currentTime}
                  readOnly
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
              </div>
              <div className="text-xs text-slate-400 mb-4">
                Sync Status: {syncStatus}
              </div>
            </>
          ) : (
            <div className="text-slate-400 mb-4">
              Waiting for host to share audio...
            </div>
          )}
          <div className="relative w-full h-24 bg-slate-700/50 rounded overflow-hidden mb-4" />
          <div className="relative h-1.5 bg-slate-400/30 rounded mb-2">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded"
              style={{ width: `60%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-slate-400 mb-6">
            <span>1:10</span>
            <span>3:30</span>
          </div>
          <div className="flex items-center justify-center mb-6">
            <button className="bg-blue-500 hover:bg-blue-600 rounded-full p-4 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
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
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-2.828a9 9 0 001.414 1.414"
                />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value="60"
                className="w-24 accent-blue-500"
                readOnly
              />
            </div>
            <div className="flex items-center text-sm text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>
                Sync: <span className="text-green-400">Good</span> (24ms)
              </span>
            </div>
          </div>
          {/* Sync log */}
          <div className="w-full max-w-md bg-slate-900/60 rounded p-2 text-xs text-slate-300 mt-6 h-24 overflow-y-auto">
            <div>Sync Log:</div>
            {logToShow.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default UI (manual join)
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Join Session
      </h1>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Enter Session Code</h2>
        <div className="flex mb-6">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            className="bg-slate-700/50 border border-slate-600 rounded-l px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={6}
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-r font-medium"
            onClick={() => setJoined(true)}
          >
            Join
          </button>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setMode("lan")}
            className={`px-4 py-2 rounded ${
              mode === "lan"
                ? "bg-blue-500 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            LAN
          </button>
          <button
            onClick={() => setMode("internet")}
            className={`px-4 py-2 rounded ${
              mode === "internet"
                ? "bg-blue-500 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Internet
          </button>
        </div>
      </div>
    </div>
  );
}
