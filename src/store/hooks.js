import { useDispatch, useSelector } from "react-redux";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

// Auth hooks
export const useAuth = () => {
  return useAppSelector((state) => state.auth);
};

export const useUser = () => {
  return useAppSelector((state) => state.auth.user);
};

// User preferences and credentials hooks
export const useUserCredentials = () => {
  return useAppSelector((state) => state.user);
};

export const useUserPreferences = () => {
  return useAppSelector((state) => state.user.preferences);
};

export const useRememberedCredentials = () => {
  return useAppSelector((state) => ({
    email: state.user.email,
    password: state.user.password,
    rememberCredentials: state.user.rememberCredentials,
  }));
};

export const useIsAuthenticated = () => {
  return useAppSelector((state) => state.auth.isAuthenticated);
};

// Audio hooks
export const useAudio = () => {
  return useAppSelector((state) => state.audio);
};

export const useAudioFile = () => {
  return useAppSelector((state) => state.audio.audioFile);
};

export const useAudioPlayback = () => {
  return useAppSelector((state) => ({
    isPlaying: state.audio.isPlaying,
    currentTime: state.audio.currentTime,
    duration: state.audio.duration,
    volume: state.audio.volume,
    isMuted: state.audio.isMuted,
    playbackRate: state.audio.playbackRate,
  }));
};

// Session hooks
export const useSession = () => {
  return useAppSelector((state) => state.session);
};

export const useSessionCode = () => {
  return useAppSelector((state) => state.session.sessionCode);
};

export const useIsHost = () => {
  return useAppSelector((state) => state.session.isHost);
};

export const useIsClient = () => {
  return useAppSelector((state) => state.session.isClient);
};

export const useConnectionMode = () => {
  return useAppSelector((state) => state.session.mode);
};

export const useConnectedDevices = () => {
  return useAppSelector((state) => state.session.connectedDevices);
};

// Sync hooks
export const useSync = () => {
  return useAppSelector((state) => state.sync);
};

export const useSyncStatus = () => {
  return useAppSelector((state) => state.sync.syncStatus);
};

export const useIsConnected = () => {
  return useAppSelector((state) => state.sync.isConnected);
};

export const useSyncMessages = () => {
  return useAppSelector((state) => state.sync.syncMessages);
};

export const useConnectedClients = () => {
  return useAppSelector((state) => state.sync.connectedClients);
};
