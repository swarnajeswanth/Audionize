import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import audioReducer from "./slices/audioSlice";
import sessionReducer from "./slices/sessionSlice";
import syncReducer from "./slices/syncSlice";
import voiceChatReducer from "./slices/voiceChatSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    audio: audioReducer,
    session: sessionReducer,
    sync: syncReducer,
    voiceChat: voiceChatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["audio/setAudioFile", "sync/setSyncData"],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["payload.audio", "payload.syncData"],
        // Ignore these paths in the state
        ignoredPaths: ["audio.audioFile", "sync.syncData"],
      },
    }),
});

// Type definitions for JavaScript usage
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;
