import { useState, useEffect, useCallback } from "react";
import connectionStateManager from "../services/connectionStateManager";

export const useConnectionState = () => {
  const [state, setState] = useState(connectionStateManager.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = connectionStateManager.subscribe((newState) => {
      setState(newState);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Wrapper functions for common operations
  const initialize = useCallback((sessionCode, role, userName) => {
    connectionStateManager.initialize(sessionCode, role, userName);
  }, []);

  const setConnected = useCallback(() => {
    connectionStateManager.setConnected();
  }, []);

  const setDisconnected = useCallback((reason) => {
    connectionStateManager.setDisconnected(reason);
  }, []);

  const setReconnecting = useCallback((attempts) => {
    connectionStateManager.setReconnecting(attempts);
  }, []);

  const setError = useCallback((error) => {
    connectionStateManager.setError(error);
  }, []);

  const setHostDisconnected = useCallback((waiting) => {
    connectionStateManager.setHostDisconnected(waiting);
  }, []);

  const updateConnectionQuality = useCallback((latency) => {
    connectionStateManager.updateConnectionQuality(latency);
  }, []);

  const incrementReconnectAttempts = useCallback(() => {
    connectionStateManager.incrementReconnectAttempts();
  }, []);

  const resetReconnectAttempts = useCallback(() => {
    connectionStateManager.resetReconnectAttempts();
  }, []);

  const cleanup = useCallback(() => {
    connectionStateManager.cleanup();
  }, []);

  // Computed values
  const isConnected = state.status === "connected";
  const isConnecting = state.status === "connecting";
  const isReconnecting = state.status === "reconnecting";
  const isDisconnected = state.status === "disconnected";
  const hasError = state.status === "error";
  const isStable = connectionStateManager.isConnectionStable();
  const healthScore = connectionStateManager.getConnectionHealthScore();
  const connectionDuration =
    connectionStateManager.getFormattedConnectionDuration();
  const statusSummary = connectionStateManager.getStatusSummary();

  return {
    // State
    ...state,

    // Computed values
    isConnected,
    isConnecting,
    isReconnecting,
    isDisconnected,
    hasError,
    isStable,
    healthScore,
    connectionDuration,
    statusSummary,

    // Actions
    initialize,
    setConnected,
    setDisconnected,
    setReconnecting,
    setError,
    setHostDisconnected,
    updateConnectionQuality,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    cleanup,

    // Raw access
    getState: connectionStateManager.getState.bind(connectionStateManager),
    getStatusSummary: connectionStateManager.getStatusSummary.bind(
      connectionStateManager
    ),
    getConnectionHealthScore:
      connectionStateManager.getConnectionHealthScore.bind(
        connectionStateManager
      ),
    isConnectionStable: connectionStateManager.isConnectionStable.bind(
      connectionStateManager
    ),
    getFormattedConnectionDuration:
      connectionStateManager.getFormattedConnectionDuration.bind(
        connectionStateManager
      ),
  };
};

export default useConnectionState;
