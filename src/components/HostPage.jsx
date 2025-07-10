import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useLanSync } from "../hooks/useLanSync";
import { useInternetSync } from "../hooks/useInternetSync";
import toast from "react-hot-toast";
import { getPrivateIp } from "../utils/getPrivateIp";
import { getPublicIp } from "../utils/getPublicIp";

export default function HostPage() {
  const { data: session, status } = useSession();
  const [audio, setAudio] = useState(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("lan"); // 'lan' or 'internet'
  const [log, setLog] = useState([]);
  const waveformRef = useRef();
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef();
  const [privateIp, setPrivateIp] = useState(null);
  const [publicIp, setPublicIp] = useState(null);
  // Placeholder session code and join links
  const sessionCode = "YOUR_SESSION_CODE";

  useEffect(() => {
    if (typeof window !== "undefined") {
      getPrivateIp().then(setPrivateIp);
      getPublicIp().then(setPublicIp);
    }
  }, []);

  if (status === "loading") return <p>Loading...</p>;
  if (!session)
    return (
      <div>
        <p>You must be signed in to host a session.</p>
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      </div>
    );

  const lanLink = privateIp
    ? `ws://${privateIp}:4000/ws?session=${sessionCode}`
    : "Detecting LAN IP...";
  const publicLink = publicIp
    ? `ws://${publicIp}:4000/ws?session=${sessionCode}`
    : "Detecting Public IP...";

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
  }, [audio]);

  useEffect(() => {
    if (!audio) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [audio]);

  useEffect(() => {
    if (audio) {
      const url = URL.createObjectURL(audio);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audio]);

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
    setIsPlaying(true);
    broadcast("play", audioRef.current.currentTime);
    audioRef.current.play();
  };
  const handlePause = () => {
    setIsPlaying(false);
    broadcast("pause", audioRef.current.currentTime);
    audioRef.current.pause();
  };
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    audioRef.current.currentTime = time;
    broadcast("seek", time);
    audioRef.current.play(); // Ensure playback resumes after seek
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

  // Example: Notify when a device connects/disconnects (simulate for now)
  useEffect(() => {
    // Simulate device connect/disconnect
    toast.success("Device connected");
    // To simulate disconnect: toast.error("Device disconnected");
  }, []);

  // Notify on sync events
  useEffect(() => {
    if (!audio) return;
    if (isPlaying) toast("Playback started");
    else toast("Playback paused");
  }, [isPlaying]);

  // Notify on seek
  useEffect(() => {
    if (!audio) return;
    toast("Seeked to " + Math.floor(currentTime) + "s");
  }, [currentTime]);

  // Notify if all clients are synced (simulate for now)
  // In a real app, track client sync status from server
  // toast.success("All devices synced");
  // toast.error("Some devices out of sync");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Host Session
      </h1>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Audio</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <button
            onClick={() => document.getElementById("audio-upload").click()}
            className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 transition p-4 rounded-lg flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Audio
          </button>
          <input
            type="file"
            id="audio-upload"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files.length > 0) setAudio(e.target.files[0]);
            }}
          />
          <button className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 transition p-4 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Use Microphone
          </button>
        </div>
        {audio && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">{audio.name}</h3>
                <p className="text-sm text-slate-400">Audio Selected</p>
              </div>
              <button
                onClick={() => setAudio(null)}
                className="text-blue-400 hover:text-blue-300"
              >
                Change
              </button>
            </div>
            {/* Audio player and controls */}
            <audio
              ref={audioRef}
              src={audioUrl}
              className="w-full mb-2"
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={(e) =>
                handleSeek({ target: { value: audioRef.current.currentTime } })
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
            </div>
            {/* Mode toggle */}
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
            {/* QR Code and join link for selected mode */}
            <div className="flex flex-col items-center gap-2 mt-2">
              <QRCode
                value={mode === "lan" ? lanLink : publicLink}
                size={128}
                bgColor="#1e293b"
                fgColor="#8b5cf6"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={mode === "lan" ? lanLink : publicLink}
                  readOnly
                  className="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 w-56"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs text-white"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      mode === "lan" ? lanLink : publicLink
                    )
                  }
                >
                  Copy
                </button>
              </div>
              <span className="text-xs text-slate-400">
                Scan or share this link to join your session (
                {mode === "lan" ? "LAN" : "Internet"})
              </span>
            </div>
            {/* Play button for demo sync */}
            <div className="mt-6 flex flex-col items-center">
              <button
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded text-white font-semibold mb-2"
                onClick={() =>
                  sendSync({
                    type: "sync",
                    action: "play",
                    timestamp: Date.now(),
                  })
                }
              >
                Play (Send Sync)
              </button>
              <div className="w-full max-w-md bg-slate-900/60 rounded p-2 text-xs text-slate-300 mt-2 h-24 overflow-y-auto">
                <div>Sync Log:</div>
                {log.slice(-5).map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Connection settings and connected devices can be added here, styled with Tailwind only */}
    </div>
  );
}
