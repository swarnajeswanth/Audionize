import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sessionCode: null,
  isHost: false,
  isClient: false,
  connectedDevices: [],
  qrCodeData: null,
  isLoading: false,
  error: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSessionCode: (state, action) => {
      state.sessionCode = action.payload;
    },
    setIsHost: (state, action) => {
      state.isHost = action.payload;
      state.isClient = !action.payload;
    },
    setIsClient: (state, action) => {
      state.isClient = action.payload;
      state.isHost = !action.payload;
    },
    setConnectedDevices: (state, action) => {
      state.connectedDevices = action.payload;
    },
    addConnectedDevice: (state, action) => {
      state.connectedDevices.push(action.payload);
    },
    removeConnectedDevice: (state, action) => {
      state.connectedDevices = state.connectedDevices.filter(
        (device) => device.id !== action.payload
      );
    },
    setQrCodeData: (state, action) => {
      state.qrCodeData = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearSession: (state) => {
      state.sessionCode = null;
      state.isHost = false;
      state.isClient = false;
      state.connectedDevices = [];
      state.qrCodeData = null;
      state.error = null;
    },
    generateSessionCode: (state) => {
      // Generate a 6-digit session code
      state.sessionCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
    },
  },
});

export const {
  setSessionCode,
  setIsHost,
  setIsClient,
  setConnectedDevices,
  addConnectedDevice,
  removeConnectedDevice,
  setQrCodeData,
  setLoading,
  setError,
  clearSession,
  generateSessionCode,
} = sessionSlice.actions;

export default sessionSlice.reducer;
