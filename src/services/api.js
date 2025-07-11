import { apiHelpers, API_ENDPOINTS } from "../lib/axios";

// Auth services
export const authService = {
  // Sign up a new user
  signup: async (userData) => {
    return apiHelpers.post(API_ENDPOINTS.AUTH.SIGNUP, userData);
  },

  // Sign in user
  signin: async (credentials) => {
    return apiHelpers.post(API_ENDPOINTS.AUTH.SIGNIN, credentials);
  },

  // Sign out user
  signout: async () => {
    return apiHelpers.post(API_ENDPOINTS.AUTH.SIGNOUT);
  },

  // Get current session
  getSession: async () => {
    return apiHelpers.get(API_ENDPOINTS.AUTH.SESSION);
  },
};

// User services
export const userService = {
  // Get user profile
  getProfile: async () => {
    return apiHelpers.get(API_ENDPOINTS.USER.PROFILE);
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return apiHelpers.put(API_ENDPOINTS.USER.UPDATE, profileData);
  },

  // Get user preferences
  getPreferences: async () => {
    return apiHelpers.get(API_ENDPOINTS.USER.PREFERENCES);
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    return apiHelpers.put(API_ENDPOINTS.USER.PREFERENCES, preferences);
  },
};

// Session services
export const sessionService = {
  // Create a new session
  createSession: async (sessionData) => {
    return apiHelpers.post(API_ENDPOINTS.SESSION.CREATE, sessionData);
  },

  // Join an existing session
  joinSession: async (sessionCode) => {
    return apiHelpers.post(API_ENDPOINTS.SESSION.JOIN, { sessionCode });
  },

  // Leave current session
  leaveSession: async () => {
    return apiHelpers.post(API_ENDPOINTS.SESSION.LEAVE);
  },

  // Get session status
  getSessionStatus: async (sessionCode) => {
    return apiHelpers.get(
      `${API_ENDPOINTS.SESSION.STATUS}?sessionCode=${sessionCode}`
    );
  },
};

// Audio services
export const audioService = {
  // Upload audio file
  uploadAudio: async (file, onProgress = null) => {
    return apiHelpers.upload(API_ENDPOINTS.AUDIO.UPLOAD, file, onProgress);
  },

  // Process audio file
  processAudio: async (audioId, options = {}) => {
    return apiHelpers.post(API_ENDPOINTS.AUDIO.PROCESS, {
      audioId,
      ...options,
    });
  },

  // Delete audio file
  deleteAudio: async (audioId) => {
    return apiHelpers.delete(
      `${API_ENDPOINTS.AUDIO.DELETE}?audioId=${audioId}`
    );
  },

  // Get audio metadata
  getAudioMetadata: async (audioId) => {
    return apiHelpers.get(`${API_ENDPOINTS.AUDIO.PROCESS}?audioId=${audioId}`);
  },
};

// Sync services
export const syncService = {
  // Get sync status
  getSyncStatus: async (sessionCode) => {
    return apiHelpers.get(
      `${API_ENDPOINTS.SYNC.STATUS}?sessionCode=${sessionCode}`
    );
  },

  // Broadcast sync data
  broadcastSync: async (sessionCode, syncData) => {
    return apiHelpers.post(API_ENDPOINTS.SYNC.BROADCAST, {
      sessionCode,
      ...syncData,
    });
  },

  // Receive sync data
  receiveSync: async (sessionCode) => {
    return apiHelpers.get(
      `${API_ENDPOINTS.SYNC.RECEIVE}?sessionCode=${sessionCode}`
    );
  },
};

// Utility services
export const utilityService = {
  // Health check
  healthCheck: async () => {
    return apiHelpers.get("/api/health");
  },

  // Get server info
  getServerInfo: async () => {
    return apiHelpers.get("/api/info");
  },

  // Get network status
  getNetworkStatus: async () => {
    return apiHelpers.get("/api/network/status");
  },
};

// Export all services
const api = {
  auth: authService,
  user: userService,
  session: sessionService,
  audio: audioService,
  sync: syncService,
  utility: utilityService,
};

export default api;
