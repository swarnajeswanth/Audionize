import { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setVoiceChatState,
  setActiveSpeakers,
  setVolumeLevels,
  addParticipant,
  removeParticipant,
  allowSpeaking,
  revokeSpeaking,
} from "../store/slices/voiceChatSlice";
import voiceChatService from "../services/voiceChatService";
import { useSelector } from "react-redux";

export const useVoiceChat = (sessionCode) => {
  const dispatch = useAppDispatch();
  const { isEnabled, isMuted, activeSpeakers, volumeLevels } = useAppSelector(
    (state) => state.voiceChat
  );
  const { isHost } = useSelector((state) => state.session);

  const [stream, setStream] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Track mute/disconnect state for this client
  const [isKicked, setIsKicked] = useState(false);
  const [isMutedByHost, setIsMutedByHost] = useState(false);

  const audioRef = useRef();
  const streamRef = useRef();
  const analyserRef = useRef();
  const animationFrameRef = useRef();
  const volumeCheckIntervalRef = useRef();
  const speakingTimeoutRef = useRef();

  // Initialize audio context and analyser
  const initializeAudio = useCallback(async () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;

      setAudioContext(context);
      setAnalyser(analyserNode);
      analyserRef.current = analyserNode;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }, []);

  // Get microphone stream
  const getMicrophoneStream = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false,
      });

      setStream(mediaStream);
      streamRef.current = mediaStream;
      return mediaStream;
    } catch (error) {
      console.error("Failed to get microphone access:", error);
      throw error;
    }
  }, []);

  // Stop volume monitoring
  const stopVolumeMonitoring = useCallback(() => {
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }

    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Volume monitoring for speaker detection
  const startVolumeMonitoring = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkVolume = () => {
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const volume = Math.round((average / 255) * 100);

      // Detect if user is speaking (volume threshold)
      const isSpeaking = volume > 10; // Adjust threshold as needed

      if (isSpeaking) {
        // Mark current user as speaking
        const currentUserId = "current-user"; // Replace with actual user ID
        dispatch(
          setActiveSpeakers({ userId: currentUserId, isSpeaking: true })
        );

        // Send speaker update via WebSocket
        if (voiceChatService.isConnected()) {
          voiceChatService.sendSpeakerUpdate(true, volume);
        }

        // Clear previous timeout
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }

        // Set timeout to mark as not speaking after silence
        speakingTimeoutRef.current = setTimeout(() => {
          dispatch(
            setActiveSpeakers({ userId: currentUserId, isSpeaking: false })
          );

          // Send speaker update via WebSocket
          if (voiceChatService.isConnected()) {
            voiceChatService.sendSpeakerUpdate(false, 0);
          }
        }, 1000); // 1 second of silence
      }

      // Update volume levels
      dispatch(setVolumeLevels({ userId: currentUserId, volume }));

      // Send volume update via WebSocket
      if (voiceChatService.isConnected()) {
        voiceChatService.sendVolumeUpdate(volume);
      }
    };

    volumeCheckIntervalRef.current = setInterval(checkVolume, 100); // Check every 100ms
  }, [dispatch]);

  // Start voice chat
  const startVoiceChat = useCallback(async () => {
    try {
      await initializeAudio();
      const mediaStream = await getMicrophoneStream();

      // Create media recorder for sending audio
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      setMediaRecorder(recorder);

      // Connect microphone to analyser for volume detection
      if (audioContext && analyser) {
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
      }

      dispatch(setVoiceChatState({ isEnabled: true }));

      // Start volume monitoring
      startVolumeMonitoring();

      return true;
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      return false;
    }
  }, [
    initializeAudio,
    getMicrophoneStream,
    audioContext,
    analyser,
    dispatch,
    startVolumeMonitoring,
  ]);

  // Stop voice chat
  const stopVoiceChat = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      setStream(null);
      streamRef.current = null;
    }

    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    setIsRecording(false);
    setIsListening(false);
    dispatch(setVoiceChatState({ isEnabled: false }));

    // Stop monitoring
    stopVolumeMonitoring();
  }, [mediaRecorder, audioContext, dispatch, stopVolumeMonitoring]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const isMuted = !audioTrack.enabled;
        dispatch(setVoiceChatState({ isMuted }));

        // Send mute status via WebSocket
        if (voiceChatService.isConnected()) {
          voiceChatService.sendMuteUpdate(isMuted);
        }
      }
    }
  }, [dispatch]);

  // Start recording and broadcasting
  const startRecording = useCallback(() => {
    if (!mediaRecorder || isRecording) return;

    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });

      // Send audio data to other participants via WebSocket
      if (voiceChatService.isConnected()) {
        voiceChatService.sendVoiceData(blob);
      }

      // Also play locally for testing
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    };

    mediaRecorder.start(100); // Record in 100ms chunks
    setIsRecording(true);
  }, [mediaRecorder, isRecording]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder, isRecording]);

  // Handle incoming audio from other participants
  const handleIncomingAudio = useCallback(
    (audioBlob, userId) => {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);

      // Apply volume ducking if first speaker is still talking
      const firstSpeaker = activeSpeakers.find((speaker) => speaker.isSpeaking);
      if (firstSpeaker && firstSpeaker.userId !== userId) {
        // Reduce volume for first speaker
        audio.volume = 0.3; // 30% volume
      } else {
        audio.volume = 1.0; // Full volume
      }

      audio.play();

      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    },
    [activeSpeakers]
  );

  // WebSocket integration
  useEffect(() => {
    if (sessionCode && isEnabled) {
      // Connect to voice chat WebSocket
      const userId = "current-user"; // Replace with actual user ID
      voiceChatService.connect(sessionCode, userId);

      // Set up message handlers
      voiceChatService.setOnMessage((data) => {
        switch (data.type) {
          case "voice_data":
            // Convert base64 back to blob
            const base64Data = data.audioBlob.split(",")[1];
            const audioBlob = new Blob(
              [Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))],
              { type: "audio/webm" }
            );
            handleIncomingAudio(audioBlob, data.userId);
            break;
          case "speaker_update":
            dispatch(
              setActiveSpeakers({
                userId: data.userId,
                isSpeaking: data.isSpeaking,
                volume: data.volume,
              })
            );
            break;
          case "volume_update":
            dispatch(
              setVolumeLevels({ userId: data.userId, volume: data.volume })
            );
            break;
          case "permission_update":
            if (data.canSpeak) {
              dispatch(allowSpeaking({ userId: data.userId }));
            } else {
              dispatch(revokeSpeaking({ userId: data.userId }));
            }
            break;
          case "mute_update":
            if (data.userId === "current-user") {
              setIsMutedByHost(data.isMuted);
            }
            break;
          case "disconnect":
            if (data.userId === "current-user") {
              setIsKicked(true);
            }
            break;
          case "audio_file_update":
            // Handle audio file updates
            break;
          case "playback_update":
            if (audioRef.current) {
              if (data.action === "play") {
                audioRef.current.currentTime = data.time;
                audioRef.current.play();
              } else if (data.action === "pause") {
                audioRef.current.currentTime = data.time;
                audioRef.current.pause();
              } else if (data.action === "seek") {
                audioRef.current.currentTime = data.time;
              }
            }
            break;
        }
      });

      voiceChatService.setOnParticipantUpdate((data) => {
        if (data.type === "joined") {
          dispatch(addParticipant(data.participant));
        } else if (data.type === "left") {
          dispatch(removeParticipant({ userId: data.userId }));
        }
      });

      return () => {
        voiceChatService.disconnect();
      };
    }
  }, [sessionCode, isEnabled, dispatch, handleIncomingAudio]);

  // Listen for mute/disconnect messages from host
  useEffect(() => {
    voiceChatService.setOnMessage((data) => {
      if (data.type === "mute_update" && data.userId === "current-user") {
        setIsMutedByHost(data.isMuted);
      }
      if (data.type === "disconnect" && data.userId === "current-user") {
        setIsKicked(true);
      }
    });
  }, []);

  // Client: Periodically report playback position to host
  useEffect(() => {
    if (!isHost && audioRef.current && sessionCode) {
      const interval = setInterval(() => {
        const currentTime = audioRef.current.currentTime;
        voiceChatService.sendMessage({
          type: "sync_report",
          sessionCode,
          userId: "current-user", // Replace with actual user ID
          currentTime,
          timestamp: Date.now(),
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isHost, sessionCode, audioRef]);

  // Host: handle sync_report messages and update sync status
  useEffect(() => {
    if (isHost && sessionCode) {
      voiceChatService.setOnMessage((data) => {
        if (data.type === "sync_report") {
          // Compare client time to host time
          const hostTime = audioRef.current?.currentTime || 0;
          const drift = Math.abs((data.currentTime || 0) - hostTime);
          let syncStatus = "in-sync";
          if (drift > 0.5) syncStatus = "out-of-sync";
          else if (drift > 0.1) syncStatus = "drift";
          // Update sync status for this client
          console.log(`Client ${data.userId} sync status: ${syncStatus}`);
        }
      });
    }
  }, [isHost, sessionCode, audioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
      stopVolumeMonitoring();
      voiceChatService.disconnect();
    };
  }, [stopVoiceChat, stopVolumeMonitoring]);

  // Host: allow/revoke speaking
  const allowSpeakingFor = (userId) => {
    voiceChatService.sendPermissionUpdate(userId, true);
    dispatch(allowSpeaking({ userId }));
  };
  const revokeSpeakingFor = (userId) => {
    voiceChatService.sendPermissionUpdate(userId, false);
    dispatch(revokeSpeaking({ userId }));
  };

  return {
    // State
    isEnabled,
    isMuted,
    isRecording,
    isListening,
    activeSpeakers,
    volumeLevels,
    isKicked,
    isMutedByHost,

    // Methods
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    startRecording,
    stopRecording,
    handleIncomingAudio,
    allowSpeakingFor,
    revokeSpeakingFor,

    // Refs
    audioRef,
  };
};
