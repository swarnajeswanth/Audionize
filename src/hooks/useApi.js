import { useCallback } from "react";
import { useLoadingState } from "./useLoadingState";
import {
  authService,
  userService,
  sessionService,
  audioService,
  syncService,
  utilityService,
} from "../services/api";
import toast from "react-hot-toast";

// Custom hook for API calls with loading states
export const useApi = () => {
  const {
    isLoading,
    error,
    success,
    withLoading,
    startLoading,
    setError,
    setSuccess,
  } = useLoadingState();

  // Wrap withLoading to show error toasts globally
  const withToastLoading = useCallback(
    async (fn, loadingText) => {
      return withLoading(async () => {
        try {
          return await fn();
        } catch (err) {
          toast.error(
            err?.response?.data?.message ||
              err?.message ||
              "Something went wrong"
          );
          throw err;
        }
      }, loadingText);
    },
    [withLoading]
  );

  // Auth API calls
  const signup = useCallback(
    async (userData, loadingText = "Creating account...") => {
      return withToastLoading(async () => {
        const response = await authService.signup(userData);
        toast.success("Account created successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const signin = useCallback(
    async (credentials, loadingText = "Signing in...") => {
      return withToastLoading(async () => {
        const response = await authService.signin(credentials);
        toast.success("Signed in successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const signout = useCallback(
    async (loadingText = "Signing out...") => {
      return withToastLoading(async () => {
        const response = await authService.signout();
        toast.success("Signed out successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const getSession = useCallback(
    async (loadingText = "Loading session...") => {
      return withToastLoading(async () => {
        return await authService.getSession();
      }, loadingText);
    },
    [withToastLoading]
  );

  // User API calls
  const getProfile = useCallback(
    async (loadingText = "Loading profile...") => {
      return withToastLoading(async () => {
        return await userService.getProfile();
      }, loadingText);
    },
    [withToastLoading]
  );

  const updateProfile = useCallback(
    async (profileData, loadingText = "Updating profile...") => {
      return withToastLoading(async () => {
        const response = await userService.updateProfile(profileData);
        toast.success("Profile updated successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const getPreferences = useCallback(
    async (loadingText = "Loading preferences...") => {
      return withToastLoading(async () => {
        return await userService.getPreferences();
      }, loadingText);
    },
    [withToastLoading]
  );

  const updatePreferences = useCallback(
    async (preferences, loadingText = "Updating preferences...") => {
      return withToastLoading(async () => {
        const response = await userService.updatePreferences(preferences);
        toast.success("Preferences updated successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  // Session API calls
  const createSession = useCallback(
    async (sessionData, loadingText = "Creating session...") => {
      return withToastLoading(async () => {
        const response = await sessionService.createSession(sessionData);
        toast.success("Session created successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const joinSession = useCallback(
    async (sessionCode, loadingText = "Joining session...") => {
      return withToastLoading(async () => {
        const response = await sessionService.joinSession(sessionCode);
        toast.success("Joined session successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const leaveSession = useCallback(
    async (loadingText = "Leaving session...") => {
      return withToastLoading(async () => {
        const response = await sessionService.leaveSession();
        toast.success("Left session successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const getSessionStatus = useCallback(
    async (sessionCode, loadingText = "Loading session status...") => {
      return withToastLoading(async () => {
        return await sessionService.getSessionStatus(sessionCode);
      }, loadingText);
    },
    [withToastLoading]
  );

  // Audio API calls
  const uploadAudio = useCallback(
    async (file, onProgress = null, loadingText = "Uploading audio...") => {
      return withToastLoading(async () => {
        const response = await audioService.uploadAudio(file, onProgress);
        toast.success("Audio uploaded successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const processAudio = useCallback(
    async (audioId, options = {}, loadingText = "Processing audio...") => {
      return withToastLoading(async () => {
        const response = await audioService.processAudio(audioId, options);
        toast.success("Audio processed successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const deleteAudio = useCallback(
    async (audioId, loadingText = "Deleting audio...") => {
      return withToastLoading(async () => {
        const response = await audioService.deleteAudio(audioId);
        toast.success("Audio deleted successfully!");
        return response;
      }, loadingText);
    },
    [withToastLoading]
  );

  const getAudioMetadata = useCallback(
    async (audioId, loadingText = "Loading audio metadata...") => {
      return withToastLoading(async () => {
        return await audioService.getAudioMetadata(audioId);
      }, loadingText);
    },
    [withToastLoading]
  );

  // Sync API calls
  const getSyncStatus = useCallback(
    async (sessionCode, loadingText = "Loading sync status...") => {
      return withToastLoading(async () => {
        return await syncService.getSyncStatus(sessionCode);
      }, loadingText);
    },
    [withToastLoading]
  );

  const broadcastSync = useCallback(
    async (sessionCode, syncData, loadingText = "Broadcasting sync...") => {
      return withToastLoading(async () => {
        return await syncService.broadcastSync(sessionCode, syncData);
      }, loadingText);
    },
    [withToastLoading]
  );

  const receiveSync = useCallback(
    async (sessionCode, loadingText = "Receiving sync...") => {
      return withToastLoading(async () => {
        return await syncService.receiveSync(sessionCode);
      }, loadingText);
    },
    [withToastLoading]
  );

  // Utility API calls
  const healthCheck = useCallback(
    async (loadingText = "Checking health...") => {
      return withToastLoading(async () => {
        return await utilityService.healthCheck();
      }, loadingText);
    },
    [withToastLoading]
  );

  const getServerInfo = useCallback(
    async (loadingText = "Loading server info...") => {
      return withToastLoading(async () => {
        return await utilityService.getServerInfo();
      }, loadingText);
    },
    [withToastLoading]
  );

  const getNetworkStatus = useCallback(
    async (loadingText = "Checking network...") => {
      return withToastLoading(async () => {
        return await utilityService.getNetworkStatus();
      }, loadingText);
    },
    [withToastLoading]
  );

  return {
    // Loading state
    isLoading,
    error,
    success,
    startLoading,
    setError,
    setSuccess,

    // Auth methods
    signup,
    signin,
    signout,
    getSession,

    // User methods
    getProfile,
    updateProfile,
    getPreferences,
    updatePreferences,

    // Session methods
    createSession,
    joinSession,
    leaveSession,
    getSessionStatus,

    // Audio methods
    uploadAudio,
    processAudio,
    deleteAudio,
    getAudioMetadata,

    // Sync methods
    getSyncStatus,
    broadcastSync,
    receiveSync,

    // Utility methods
    healthCheck,
    getServerInfo,
    getNetworkStatus,
  };
};
