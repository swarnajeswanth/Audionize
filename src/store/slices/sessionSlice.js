import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sessionCode: null,
  isHost: false,
  isClient: false,
  mode: "lan", // 'lan' or 'internet'
  privateIp: null,
  publicIp: null,
  lanLink: null,
  publicLink: null,
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
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    setPrivateIp: (state, action) => {
      state.privateIp = action.payload;
      if (state.sessionCode) {
        state.lanLink = `ws://${action.payload}:4000/ws?session=${state.sessionCode}`;
      }
    },
    setPublicIp: (state, action) => {
      state.publicIp = action.payload;
      if (state.sessionCode) {
        state.publicLink = `ws://${action.payload}:4000/ws?session=${state.sessionCode}`;
      }
    },
    setLanLink: (state, action) => {
      state.lanLink = action.payload;
    },
    setPublicLink: (state, action) => {
      state.publicLink = action.payload;
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
      if (state.privateIp) {
        state.lanLink = `ws://${state.privateIp}:4000/ws?session=${state.sessionCode}`;
      }
      if (state.publicIp) {
        state.publicLink = `ws://${state.publicIp}:4000/ws?session=${state.sessionCode}`;
      }
    },
  },
});

export const {
  setSessionCode,
  setIsHost,
  setIsClient,
  setMode,
  setPrivateIp,
  setPublicIp,
  setLanLink,
  setPublicLink,
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
