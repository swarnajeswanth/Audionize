import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConnected: false,
  syncStatus: "idle", // 'idle', 'connecting', 'connected', 'syncing', 'error'
  lastSyncTime: null,
  drift: 0,
  syncMessages: [],
  connectedClients: [],
  hostInfo: null,
  syncData: null,
  error: null,
  isHost: false,
  isClient: false,
  // Settings properties
  syncTolerance: 50, // milliseconds
  autoReconnect: true,
  normalizeVolume: false,
  bufferSize: "Medium (Balanced)",
};

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        state.syncStatus = "idle";
        state.connectedClients = [];
      }
    },
    setSyncStatus: (state, action) => {
      state.syncStatus = action.payload;
    },
    setLastSyncTime: (state, action) => {
      state.lastSyncTime = action.payload;
    },
    setDrift: (state, action) => {
      state.drift = action.payload;
    },
    addSyncMessage: (state, action) => {
      state.syncMessages.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      });
      // Keep only last 50 messages
      if (state.syncMessages.length > 50) {
        state.syncMessages = state.syncMessages.slice(-50);
      }
    },
    clearSyncMessages: (state) => {
      state.syncMessages = [];
    },
    setConnectedClients: (state, action) => {
      state.connectedClients = action.payload;
    },
    addConnectedClient: (state, action) => {
      const existingIndex = state.connectedClients.findIndex(
        (client) => client.id === action.payload.id
      );
      if (existingIndex >= 0) {
        state.connectedClients[existingIndex] = action.payload;
      } else {
        state.connectedClients.push(action.payload);
      }
    },
    removeConnectedClient: (state, action) => {
      state.connectedClients = state.connectedClients.filter(
        (client) => client.id !== action.payload
      );
    },
    setHostInfo: (state, action) => {
      state.hostInfo = action.payload;
    },
    setSyncData: (state, action) => {
      state.syncData = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.syncStatus = "error";
    },
    setIsHost: (state, action) => {
      state.isHost = action.payload;
      state.isClient = !action.payload;
    },
    setIsClient: (state, action) => {
      state.isClient = action.payload;
      state.isHost = !action.payload;
    },
    clearSync: (state) => {
      state.isConnected = false;
      state.syncStatus = "idle";
      state.lastSyncTime = null;
      state.drift = 0;
      state.syncMessages = [];
      state.connectedClients = [];
      state.hostInfo = null;
      state.syncData = null;
      state.error = null;
    },
    updateClientSyncStatus: (state, action) => {
      const { clientId, status, currentTime, drift } = action.payload;
      const client = state.connectedClients.find((c) => c.id === clientId);
      if (client) {
        client.status = status;
        client.currentTime = currentTime;
        client.drift = drift;
        client.lastUpdate = new Date().toISOString();
      }
    },
    setMuted: (state, action) => {
      const { clientId, isMuted } = action.payload;
      const client = state.connectedClients.find((c) => c.id === clientId);
      if (client) {
        client.isMuted = isMuted;
      }
    },
    // Settings reducers
    setSyncTolerance: (state, action) => {
      state.syncTolerance = action.payload;
    },
    setAutoReconnect: (state, action) => {
      state.autoReconnect = action.payload;
    },
    setNormalizeVolume: (state, action) => {
      state.normalizeVolume = action.payload;
    },
    setBufferSize: (state, action) => {
      state.bufferSize = action.payload;
    },
  },
});

export const {
  setConnected,
  setSyncStatus,
  setLastSyncTime,
  setDrift,
  addSyncMessage,
  clearSyncMessages,
  setConnectedClients,
  addConnectedClient,
  removeConnectedClient,
  setHostInfo,
  setSyncData,
  setError,
  setIsHost,
  setIsClient,
  clearSync,
  updateClientSyncStatus,
  setMuted,
  // Settings actions
  setSyncTolerance,
  setAutoReconnect,
  setNormalizeVolume,
  setBufferSize,
} = syncSlice.actions;

export default syncSlice.reducer;
