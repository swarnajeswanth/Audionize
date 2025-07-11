"use client";
import { useState, useEffect } from "react";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useAppSelector } from "../store/hooks";
import {
  selectActiveSpeakers,
  selectVolumeLevels,
  selectParticipants,
} from "../store/slices/voiceChatSlice";
import toast from "react-hot-toast";
import { useAuth } from "../store/hooks";

export default function VoiceChat({ sessionCode, mode }) {
  const [isPressed, setIsPressed] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const {
    isEnabled,
    isMuted,
    isRecording,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    startRecording,
    stopRecording,
    audioRef,
    allowSpeakingFor,
    revokeSpeakingFor,
    isKicked,
    isMutedByHost,
  } = useVoiceChat(sessionCode);

  const activeSpeakers = useAppSelector(selectActiveSpeakers);
  const volumeLevels = useAppSelector(selectVolumeLevels);
  const participants = useAppSelector(selectParticipants);
  const { user, isAuthenticated } = useAuth();

  // Find current user in participants
  const me = participants.find(
    (p) => p.userId === (user?.id || "current-user")
  );
  const canSpeak = me?.canSpeak ?? true; // Default true for host or if not set
  const isHost = user?.role === "host";

  // LAN/Internet mic permissions
  if (mode === "internet" && !isAuthenticated) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl text-center">
        <h3 className="text-white font-medium mb-2">Voice Chat</h3>
        <p className="text-red-400 mb-2">
          Login required to use voice chat over the Internet.
        </p>
        <a href="/auth/signin" className="underline text-blue-400">
          Sign in
        </a>
      </div>
    );
  }

  if (isKicked) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl text-center">
        <h3 className="text-white font-medium mb-2">Voice Chat</h3>
        <p className="text-red-400 mb-2">
          You have been disconnected by the host.
        </p>
      </div>
    );
  }
  if (isMutedByHost) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl text-center">
        <h3 className="text-white font-medium mb-2">Voice Chat</h3>
        <p className="text-yellow-400 mb-2">You have been muted by the host.</p>
      </div>
    );
  }

  // Handle microphone button press
  const handleMicPress = async () => {
    if (!isEnabled) {
      const success = await startVoiceChat();
      if (!success) {
        toast.error("Failed to access microphone. Please check permissions.");
        return;
      }
      toast.success("Voice chat enabled!");
    }

    if (!isRecording) {
      startRecording();
      setIsPressed(true);
    }
  };

  // Handle microphone button release
  const handleMicRelease = () => {
    if (isRecording) {
      stopRecording();
      setIsPressed(false);
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    toggleMute();
    toast.success(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  // Handle voice chat toggle
  const handleVoiceChatToggle = () => {
    if (isEnabled) {
      stopVoiceChat();
      toast.success("Voice chat disabled");
    } else {
      startVoiceChat();
      toast.success("Voice chat enabled!");
    }
  };

  // Get volume bar height based on volume level
  const getVolumeBarHeight = (volume) => {
    return Math.max(4, (volume / 100) * 40);
  };

  // Get speaking indicator color
  const getSpeakingColor = (isSpeaking, volume) => {
    if (isSpeaking) {
      if (volume > 50) return "bg-red-500";
      if (volume > 25) return "bg-yellow-500";
      return "bg-green-500";
    }
    return "bg-gray-400";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main Voice Chat Panel */}
      <div className="bg-slate-900/90 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isEnabled ? "bg-green-500" : "bg-gray-500"
              }`}
            ></div>
            <h3 className="text-white font-medium">Voice Chat</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Participants Button */}
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Show participants"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>

            {/* Settings Button */}
            <button
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Voice chat settings"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Main Microphone Button */}
          <button
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            onTouchStart={handleMicPress}
            onTouchEnd={handleMicRelease}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
              ${
                isPressed || isRecording
                  ? "bg-red-500 shadow-lg shadow-red-500/50 scale-110"
                  : isMuted
                  ? "bg-gray-600 hover:bg-gray-500"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
              }
            `}
            disabled={!isEnabled || !canSpeak}
          >
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse"></div>
            )}

            {/* Microphone icon */}
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMuted ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              )}
            </svg>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={handleMuteToggle}
            className={`
              p-3 rounded-full transition-all duration-200
              ${
                isMuted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-gray-600/20 text-gray-400 hover:bg-gray-600/30"
              }
            `}
            disabled={!isEnabled}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </button>

          {/* Voice Chat Toggle */}
          <button
            onClick={handleVoiceChatToggle}
            className={`
              p-3 rounded-full transition-all duration-200
              ${
                isEnabled
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-gray-600/20 text-gray-400 hover:bg-gray-600/30"
              }
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </button>
        </div>

        {/* Volume Visualization */}
        {isEnabled && (
          <div className="mt-4">
            <div className="flex items-end justify-center space-x-1 h-12">
              {Array.from({ length: 20 }, (_, i) => {
                const volume = volumeLevels["current-user"] || 0;
                const barHeight = getVolumeBarHeight(volume * (i / 20));
                return (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-100"
                    style={{ height: `${barHeight}px` }}
                  ></div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Text */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400">
            {!isEnabled && "Click to enable voice chat"}
            {isEnabled && isMuted && "Microphone muted"}
            {isEnabled && !isMuted && isRecording && "Recording..."}
            {isEnabled && !isMuted && !isRecording && "Hold to speak"}
          </p>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute bottom-full right-0 mb-4 bg-slate-900/90 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-2xl min-w-64">
          <h4 className="text-white font-medium mb-3">Participants</h4>

          {participants.length === 0 ? (
            <p className="text-gray-400 text-sm">No participants connected</p>
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => {
                const isSpeaking = activeSpeakers.find(
                  (s) => s.userId === participant.userId
                )?.isSpeaking;
                const volume = volumeLevels[participant.userId] || 0;

                return (
                  <div
                    key={participant.userId}
                    className="flex items-center space-x-3"
                  >
                    {/* Speaking indicator */}
                    <div
                      className={`
                      w-3 h-3 rounded-full transition-all duration-200
                      ${getSpeakingColor(isSpeaking, volume)}
                    `}
                    ></div>

                    {/* Participant info */}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {participant.name || "Unknown"}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {participant.userId}
                      </p>
                    </div>

                    {/* Volume bar */}
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-200"
                        style={{ width: `${volume}%` }}
                      ></div>
                    </div>

                    {/* Host controls for speaker */}
                    {isHost && (
                      <button
                        onClick={() =>
                          participant.canSpeak
                            ? revokeSpeakingFor(participant.userId)
                            : allowSpeakingFor(participant.userId)
                        }
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          participant.canSpeak
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {participant.canSpeak ? "Revoke" : "Allow"} Speak
                      </button>
                    )}

                    {/* If !canSpeak, show a message */}
                    {!canSpeak && (
                      <div className="text-yellow-400 text-center mt-2">
                        The host has not granted you permission to speak.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}
