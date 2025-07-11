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
  waveform: [],
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
    },
    setPlaying: (state, action) => {
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
    setMuted: (state, action) => {
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
    setWaveform: (state, action) => {
      state.waveform = action.payload;
    },
    clearAudio: (state) => {
      state.audioFile = null;
      state.audioUrl = null;
      state.isPlaying = false;
      state.currentTime = 0;
      state.duration = 0;
      state.error = null;
      state.waveform = [];
    },
    seekTo: (state, action) => {
      state.currentTime = action.payload;
    },
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
  },
});

export const {
  setAudioFile,
  setAudioUrl,
  setPlaying,
  setCurrentTime,
  setDuration,
  setVolume,
  setMuted,
  setPlaybackRate,
  setLoading,
  setError,
  setWaveform,
  clearAudio,
  seekTo,
  play,
  pause,
} = audioSlice.actions;

export default audioSlice.reducer;
