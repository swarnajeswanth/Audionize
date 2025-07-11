import { createSlice } from "@reduxjs/toolkit";

// Load user data from localStorage on initialization
const loadUserFromStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("audionize_user");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error loading user from storage:", error);
    return null;
  }
};

const initialState = {
  email: "",
  password: "", // Note: In production, consider if you really want to store passwords
  rememberCredentials: false,
  preferences: {
    autoConnect: true,
    defaultMode: "lan", // 'lan' or 'internet'
    audioQuality: "high", // 'low', 'medium', 'high'
    notifications: true,
  },
  lastLogin: null,
  loginCount: 0,
};

const userSlice = createSlice({
  name: "user",
  initialState: {
    ...initialState,
    ...loadUserFromStorage(),
  },
  reducers: {
    setCredentials: (state, action) => {
      const { email, password, remember } = action.payload;
      state.email = email;
      if (remember) {
        state.password = password;
        state.rememberCredentials = true;
      } else {
        state.password = "";
        state.rememberCredentials = false;
      }
      state.lastLogin = new Date().toISOString();
      state.loginCount += 1;

      // Save to localStorage if remember is true
      if (remember && typeof window !== "undefined") {
        localStorage.setItem(
          "audionize_user",
          JSON.stringify({
            email: state.email,
            password: state.password,
            rememberCredentials: state.rememberCredentials,
            preferences: state.preferences,
            lastLogin: state.lastLogin,
            loginCount: state.loginCount,
          })
        );
      }
    },
    clearCredentials: (state) => {
      state.email = "";
      state.password = "";
      state.rememberCredentials = false;

      // Clear from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("audionize_user");
      }
    },
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };

      // Save to localStorage if credentials are remembered
      if (state.rememberCredentials && typeof window !== "undefined") {
        const stored = JSON.parse(
          localStorage.getItem("audionize_user") || "{}"
        );
        stored.preferences = state.preferences;
        localStorage.setItem("audionize_user", JSON.stringify(stored));
      }
    },
    setLastLogin: (state, action) => {
      state.lastLogin = action.payload;
      state.loginCount += 1;

      // Update localStorage
      if (state.rememberCredentials && typeof window !== "undefined") {
        const stored = JSON.parse(
          localStorage.getItem("audionize_user") || "{}"
        );
        stored.lastLogin = state.lastLogin;
        stored.loginCount = state.loginCount;
        localStorage.setItem("audionize_user", JSON.stringify(stored));
      }
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  updatePreferences,
  setLastLogin,
} = userSlice.actions;

export default userSlice.reducer;
