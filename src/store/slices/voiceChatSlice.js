import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isEnabled: false,
  isMuted: false,
  isRecording: false,
  isListening: false,
  activeSpeakers: [], // Array of { userId, isSpeaking, volume }
  volumeLevels: {}, // { userId: volume }
  participants: [], // Array of connected participants
  audioSettings: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
  permissions: {
    microphone: false,
    audioContext: false,
  },
  errors: [],
};

const voiceChatSlice = createSlice({
  name: "voiceChat",
  initialState,
  reducers: {
    // Set voice chat state
    setVoiceChatState: (state, action) => {
      const { isEnabled, isMuted, isRecording, isListening } = action.payload;
      if (isEnabled !== undefined) state.isEnabled = isEnabled;
      if (isMuted !== undefined) state.isMuted = isMuted;
      if (isRecording !== undefined) state.isRecording = isRecording;
      if (isListening !== undefined) state.isListening = isListening;
    },

    // Set active speakers
    setActiveSpeakers: (state, action) => {
      const { userId, isSpeaking, volume } = action.payload;
      const existingIndex = state.activeSpeakers.findIndex(
        (speaker) => speaker.userId === userId
      );

      if (existingIndex >= 0) {
        state.activeSpeakers[existingIndex] = {
          userId,
          isSpeaking,
          volume: volume || 0,
        };
      } else {
        state.activeSpeakers.push({ userId, isSpeaking, volume: volume || 0 });
      }

      // Remove speakers who are not speaking
      state.activeSpeakers = state.activeSpeakers.filter(
        (speaker) => speaker.isSpeaking || speaker.volume > 0
      );
    },

    // Set volume levels
    setVolumeLevels: (state, action) => {
      const { userId, volume } = action.payload;
      state.volumeLevels[userId] = volume;
    },

    // Add participant
    addParticipant: (state, action) => {
      const participant = { ...action.payload, canSpeak: false };
      if (!state.participants.find((p) => p.userId === participant.userId)) {
        state.participants.push(participant);
      }
    },

    // Allow speaking
    allowSpeaking: (state, action) => {
      const { userId } = action.payload;
      const participant = state.participants.find((p) => p.userId === userId);
      if (participant) participant.canSpeak = true;
    },

    // Revoke speaking
    revokeSpeaking: (state, action) => {
      const { userId } = action.payload;
      const participant = state.participants.find((p) => p.userId === userId);
      if (participant) participant.canSpeak = false;
    },

    // Remove participant
    removeParticipant: (state, action) => {
      const { userId } = action.payload;
      state.participants = state.participants.filter(
        (p) => p.userId !== userId
      );

      // Also remove from active speakers and volume levels
      state.activeSpeakers = state.activeSpeakers.filter(
        (speaker) => speaker.userId !== userId
      );
      delete state.volumeLevels[userId];
    },

    // Update participant
    updateParticipant: (state, action) => {
      const { userId, updates } = action.payload;
      const index = state.participants.findIndex((p) => p.userId === userId);
      if (index >= 0) {
        state.participants[index] = {
          ...state.participants[index],
          ...updates,
        };
      }
    },

    // Set audio settings
    setAudioSettings: (state, action) => {
      state.audioSettings = { ...state.audioSettings, ...action.payload };
    },

    // Set permissions
    setPermissions: (state, action) => {
      state.permissions = { ...state.permissions, ...action.payload };
    },

    // Add error
    addError: (state, action) => {
      state.errors.push({
        id: Date.now(),
        message: action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // Clear errors
    clearErrors: (state) => {
      state.errors = [];
    },

    // Reset voice chat
    resetVoiceChat: (state) => {
      return {
        ...initialState,
        audioSettings: state.audioSettings, // Preserve settings
        permissions: state.permissions, // Preserve permissions
      };
    },

    // Start recording
    startRecording: (state) => {
      state.isRecording = true;
    },

    // Stop recording
    stopRecording: (state) => {
      state.isRecording = false;
    },

    // Toggle mute
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },

    // Enable voice chat
    enableVoiceChat: (state) => {
      state.isEnabled = true;
    },

    // Disable voice chat
    disableVoiceChat: (state) => {
      state.isEnabled = false;
      state.isRecording = false;
      state.isListening = false;
      state.activeSpeakers = [];
      state.volumeLevels = {};
    },
  },
});

export const {
  setVoiceChatState,
  setActiveSpeakers,
  setVolumeLevels,
  addParticipant,
  removeParticipant,
  updateParticipant,
  setAudioSettings,
  setPermissions,
  addError,
  clearErrors,
  resetVoiceChat,
  startRecording,
  stopRecording,
  toggleMute,
  enableVoiceChat,
  disableVoiceChat,
  allowSpeaking,
  revokeSpeaking,
} = voiceChatSlice.actions;

// Selectors
export const selectVoiceChat = (state) => state.voiceChat;
export const selectIsVoiceChatEnabled = (state) => state.voiceChat.isEnabled;
export const selectIsMuted = (state) => state.voiceChat.isMuted;
export const selectIsRecording = (state) => state.voiceChat.isRecording;
export const selectActiveSpeakers = (state) => state.voiceChat.activeSpeakers;
export const selectVolumeLevels = (state) => state.voiceChat.volumeLevels;
export const selectParticipants = (state) => state.voiceChat.participants;
export const selectAudioSettings = (state) => state.voiceChat.audioSettings;
export const selectPermissions = (state) => state.voiceChat.permissions;
export const selectErrors = (state) => state.voiceChat.errors;

// Helper selectors
export const selectSpeakingParticipants = (state) =>
  state.voiceChat.activeSpeakers.filter((speaker) => speaker.isSpeaking);

export const selectFirstSpeaker = (state) =>
  state.voiceChat.activeSpeakers.find((speaker) => speaker.isSpeaking);

export const selectParticipantCount = (state) =>
  state.voiceChat.participants.length;

export default voiceChatSlice.reducer;
