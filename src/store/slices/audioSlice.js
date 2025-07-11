import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  audioFile: null,
  audioUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isLoading: false,
  error: null,
};

const audioSlice = createSlice({
  name: "audio",
  initialState,
  reducers: {
    setAudioFile: (state, action) => {
      state.audioFile = action.payload;
      state.error = null;
    },
    setAudioUrl: (state, action) => {
      state.audioUrl = action.payload;
      state.error = null;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setCurrentTime: (state, action) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    setIsMuted: (state, action) => {
      state.isMuted = action.payload;
    },
    setPlaybackRate: (state, action) => {
      state.playbackRate = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearAudio: (state) => {
      state.audioFile = null;
      state.audioUrl = null;
      state.isPlaying = false;
      state.currentTime = 0;
      state.duration = 0;
      state.volume = 1;
      state.isMuted = false;
      state.playbackRate = 1;
      state.error = null;
    },
    updateAudioState: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setAudioFile,
  setAudioUrl,
  setIsPlaying,
  setCurrentTime,
  setDuration,
  setVolume,
  setIsMuted,
  setPlaybackRate,
  setLoading,
  setError,
  clearAudio,
  updateAudioState,
} = audioSlice.actions;

export default audioSlice.reducer;
