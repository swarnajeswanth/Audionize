"use client";
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setCurrentTime,
  setDuration,
  setIsPlaying,
} from "../store/slices/audioSlice";

const ModernAudioPlayer = forwardRef(function ModernAudioPlayer(
  {
    audioUrl,
    onPlay,
    onPause,
    onSeek,
    onVolumeChange,
    isHost = false,
    disabled = false,
    onLoadedMetadata,
    onError,
  },
  ref
) {
  const dispatch = useAppDispatch();
  const { currentTime, duration, isPlaying } = useAppSelector(
    (state) => state.audio
  );

  const [volume, setVolume] = useState(1);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const audioRef = useRef(null);

  // Enhanced sync properties
  const [driftCorrection, setDriftCorrection] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const syncIntervalRef = useRef(null);

  // Add state for buffering
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [minBufferPercent, setMinBufferPercent] = useState(30); // Start with 30%
  const [waitingForBuffer, setWaitingForBuffer] = useState(false);

  // Expose imperative methods to parent
  useImperativeHandle(ref, () => ({
    play: () => audioRef.current && audioRef.current.play(),
    pause: () => audioRef.current && audioRef.current.pause(),
    setCurrentTime: (t) => {
      if (audioRef.current) {
        audioRef.current.currentTime = t;
        setLastSyncTime(Date.now());
      }
    },
    get audio() {
      return audioRef.current;
    },
    // Enhanced methods for sync
    getCurrentTime: () => audioRef.current?.currentTime || 0,
    getDriftCorrection: () => driftCorrection,
    setDriftCorrection: (correction) => setDriftCorrection(correction),
  }));

  // Update buffered percent on progress
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const updateBuffer = () => {
      if (!audio.duration || isNaN(audio.duration)) {
        setBufferedPercent(0);
        return;
      }
      let buffered = 0;
      for (let i = 0; i < audio.buffered.length; i++) {
        if (
          audio.buffered.start(i) <= audio.currentTime &&
          audio.currentTime <= audio.buffered.end(i)
        ) {
          buffered = audio.buffered.end(i);
          break;
        }
      }
      setBufferedPercent(Math.floor((buffered / audio.duration) * 100));
    };
    audio.addEventListener("progress", updateBuffer);
    audio.addEventListener("timeupdate", updateBuffer);
    return () => {
      audio.removeEventListener("progress", updateBuffer);
      audio.removeEventListener("timeupdate", updateBuffer);
    };
  }, [audioUrl]);

  // Handle time update with drift correction
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      const correctedTime = time + driftCorrection;
      dispatch(setCurrentTime(correctedTime));
    }
  };

  // Note: Drift correction is now handled in ClientPage component for better accuracy

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration));
      setLastSyncTime(Date.now());
    }
  };

  // Only enable play if bufferedPercent >= minBufferPercent (for clients)
  const canPlay = isHost || bufferedPercent >= minBufferPercent;

  // Show/hide waiting spinner if buffering is insufficient
  useEffect(() => {
    if (!isHost && !canPlay) {
      setWaitingForBuffer(true);
    } else {
      setWaitingForBuffer(false);
    }
  }, [canPlay, isHost]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current || disabled || !isHost) return;

    if (isPlaying) {
      audioRef.current.pause();
      dispatch(setIsPlaying(false));
      if (onPause) onPause();
    } else {
      // For host, don't auto-play - let the sync system handle timing
      // The actual play will be scheduled by the host's handlePlay function
      if (onPlay) onPlay();
    }
  };

  // If client seeks near buffer edge, increase minBufferPercent
  const handleSeek = (e) => {
    if (!audioRef.current || disabled || isHost) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * duration;
    const bufferEdge = (bufferedPercent / 100) * duration;
    // If seeking within 10% of buffer edge, increase buffer threshold
    if (seekTime > bufferEdge - duration * 0.1) {
      setMinBufferPercent(Math.min(80, minBufferPercent + 20));
      setWaitingForBuffer(true);
    }
    audioRef.current.currentTime = seekTime;
    dispatch(setCurrentTime(seekTime));
    if (onSeek) onSeek(seekTime);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    if (!audioRef.current || disabled) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    if (onVolumeChange) onVolumeChange(newVolume);
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          handleLoadedMetadata(e);
          if (onLoadedMetadata) onLoadedMetadata(e);
        }}
        onPlay={() => dispatch(setIsPlaying(true))}
        onPause={() => dispatch(setIsPlaying(false))}
        onError={(e) => {
          console.error("Audio error:", e);
          if (onError) onError(e);
        }}
        preload="metadata"
        // Enhanced audio settings for better sync
        crossOrigin="anonymous"
        // Reduce buffer size for lower latency
        style={{
          // Custom audio settings for better performance
          willChange: "auto",
        }}
      />

      {/* Main Player Controls */}
      <div className="flex items-center justify-between mb-6">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={disabled || !audioUrl || (!isHost && !canPlay)}
          className={`relative group ${
            disabled || !audioUrl || (!isHost && !canPlay)
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 transition-transform"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              isHost
                ? "bg-gradient-to-br from-blue-500 to-purple-600"
                : "bg-gradient-to-br from-slate-600 to-slate-700"
            }`}
          >
            {isPlaying ? (
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity -z-10"></div>
        </button>

        {/* Track Info */}
        <div className="flex-1 mx-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-1">
              {audioUrl ? "Now Playing" : "No Audio"}
            </h3>
            <p className="text-slate-400 text-sm">
              {isHost ? "Host Controls" : "Client Mode - Volume Only"}
            </p>
          </div>
        </div>

        {/* Volume Control */}
        <div
          className="relative"
          onMouseEnter={() => setIsVolumeHovered(true)}
          onMouseLeave={() => setIsVolumeHovered(false)}
        >
          <button
            className="w-12 h-12 bg-slate-700/50 hover:bg-slate-600/50 rounded-full flex items-center justify-center transition-colors"
            disabled={disabled}
          >
            {volume === 0 ? (
              <svg
                className="w-5 h-5 text-slate-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg
                className="w-5 h-5 text-slate-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-slate-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          {/* Volume Slider */}
          <div
            className={`absolute right-0 top-14 bg-slate-800/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 transition-all duration-300 ${
              isVolumeHovered ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className="w-24 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                  volume * 100
                }%, #475569 ${volume * 100}%, #475569 100%)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className={`relative h-2 rounded-full overflow-hidden ${
            isHost && !disabled && audioUrl
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-60"
          }`}
          onClick={isHost ? handleSeek : undefined}
          onMouseEnter={() => setIsProgressHovered(true)}
          onMouseLeave={() => setIsProgressHovered(false)}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-slate-600/30 rounded-full"></div>

          {/* Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>

          {/* Progress Glow */}
          <div
            className={`absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-sm transition-all duration-300 ${
              isProgressHovered && isHost ? "opacity-50" : "opacity-0"
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>

          {/* Progress Handle */}
          <div
            className={`absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform -translate-y-1/2 transition-all duration-300 ${
              isProgressHovered && isHost ? "scale-125" : "scale-100"
            }`}
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          ></div>
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-sm text-slate-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center">
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            audioUrl
              ? isPlaying
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              audioUrl
                ? isPlaying
                  ? "bg-green-400 animate-pulse"
                  : "bg-yellow-400"
                : "bg-slate-400"
            }`}
          ></div>
          {audioUrl ? (isPlaying ? "Playing" : "Paused") : "No Audio"}
        </div>
      </div>
      {/* Show buffering spinner/message for clients if not enough buffered */}
      {!isHost && waitingForBuffer && (
        <div className="flex items-center justify-center mt-2">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-blue-300 text-xs">
            Buffering... {bufferedPercent}%
          </span>
        </div>
      )}
    </div>
  );
});

export default ModernAudioPlayer;
