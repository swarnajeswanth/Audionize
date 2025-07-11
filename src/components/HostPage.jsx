"use client";
import { useState, useRef } from "react";
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
} from "../store/slices/audioSlice";
// import your socket service or hook here
// import { socket } from "../services/voiceChatService";

export default function HostPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { sessionCode } = useSessionStore();
  const { isConnected, connectedClients } = useSync();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [audioFile, setAudioFileState] = useState(null);
  const [audioUrl, setAudioUrlState] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(1);
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
  }?code=${sessionCode}`;

  // Audio upload handler
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFileState(file);
      const url = URL.createObjectURL(file);
      setAudioUrlState(url);
      setCurrentTimeState(0);
      setDurationState(0);
    }
  };

  // Player controls
  const handlePlay = () => {
    setIsPlaying(true);
    audioRef.current.play();
  };
  const handlePause = () => {
    setIsPlaying(false);
    audioRef.current.pause();
  };
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTimeState(time);
    audioRef.current.currentTime = time;
  };
  const handleTimeUpdate = () => {
    setCurrentTimeState(audioRef.current.currentTime);
  };
  const handleLoadedMetadata = () => {
    setDurationState(audioRef.current.duration || 0);
  };

  // Volume control
  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setPlayerVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  // --- Real-time actions ---
  // These are stubs; you must connect them to your socket service
  const handleMuteClient = (clientId) => {
    // socket.emit("mute-client", { sessionCode, clientId });
    // Update UI optimistically if desired
    alert(`Mute/unmute client: ${clientId}`);
  };
  const handleDisconnectClient = (clientId) => {
    // socket.emit("disconnect-client", { sessionCode, clientId });
    alert(`Disconnect client: ${clientId}`);
  };
  const handleSyncMusic = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      // socket.emit("sync-play", { sessionCode, time });
      alert(`Sync & Play sent to all clients at time: ${time}s`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Host Session</h1>
        <p className="text-slate-300 mb-4">
          Welcome, {user?.name || user?.email || "Host"}!
        </p>
        <div className="bg-slate-700/30 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Session Code</h3>
          <p className="text-2xl font-mono text-blue-400 mb-2">
            {sessionCode || "Generating..."}
          </p>
          <p className="text-sm text-slate-400">
            Share this code with others to join your session
          </p>
        </div>
        <div className="bg-slate-700/30 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Join Link</h3>
          <p className="text-sm text-slate-300 break-all mb-2">{joinUrl}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              alert("Link copied to clipboard!");
            }}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white text-sm"
          >
            Copy Link
          </button>
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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
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
                  onChange={handleVolumeChange}
                  className="w-24 accent-blue-500"
                  title="Volume"
                />
                <button
                  className="ml-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold shadow"
                  onClick={handleSyncMusic}
                >
                  Sync & Play
                </button>
              </div>
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
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium">
                      {client.name || client.userId}
                    </span>
                  </div>
                  <span className="ml-2 text-xs text-slate-400">
                    {client.syncStatus || "connected"}
                  </span>
                  <button
                    onClick={() => handleMuteClient(client.userId || idx)}
                    className="px-2 py-1 rounded text-xs bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    Mute/Unmute
                  </button>
                  <button
                    onClick={() => handleDisconnectClient(client.userId || idx)}
                    className="px-2 py-1 rounded text-xs bg-red-700 text-white hover:bg-red-800"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Debug info */}
      <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-red-400">Debug Info</h3>
        <p className="text-sm text-slate-300">
          Authenticated: {isAuthenticated ? "Yes" : "No"}
        </p>
        <p className="text-sm text-slate-300">User: {JSON.stringify(user)}</p>
        <p className="text-sm text-slate-300">Session Code: {sessionCode}</p>
      </div>
    </div>
  );
}
