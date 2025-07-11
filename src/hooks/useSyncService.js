import { useEffect, useRef, useCallback } from "react";
import syncService from "../services/syncService";

export const useSyncService = (sessionCode, role, userName) => {
  const isConnectedRef = useRef(false);

  // Connect to sync service
  useEffect(() => {
    if (sessionCode && role && userName && !isConnectedRef.current) {
      syncService.connect(sessionCode, role, userName);
      isConnectedRef.current = true;
    }

    return () => {
      if (isConnectedRef.current) {
        syncService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [sessionCode, role, userName]);

  // Set up message handlers
  const setMessageHandler = useCallback((handler) => {
    syncService.setOnMessage(handler);
  }, []);

  const setClientUpdateHandler = useCallback((handler) => {
    syncService.setOnClientUpdate(handler);
  }, []);

  const setAudioUpdateHandler = useCallback((handler) => {
    syncService.setOnAudioUpdate(handler);
  }, []);

  // Send commands
  const sendAudio = useCallback((audioBlob, fileName, fileSize) => {
    syncService.sendAudio(audioBlob, fileName, fileSize);
  }, []);

  const sendPlay = useCallback((currentTime = 0) => {
    syncService.sendPlay(currentTime);
  }, []);

  const sendPause = useCallback(() => {
    syncService.sendPause();
  }, []);

  const sendSeek = useCallback((currentTime) => {
    syncService.sendSeek(currentTime);
  }, []);

  const sendVolume = useCallback((volume) => {
    syncService.sendVolume(volume);
  }, []);

  const sendSyncAll = useCallback((currentTime) => {
    syncService.sendSyncAll(currentTime);
  }, []);

  const sendTimeUpdate = useCallback((currentTime) => {
    syncService.sendTimeUpdate(currentTime);
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return syncService.getConnectionStatus();
  }, []);

  return {
    setMessageHandler,
    setClientUpdateHandler,
    setAudioUpdateHandler,
    sendAudio,
    sendPlay,
    sendPause,
    sendSeek,
    sendVolume,
    sendSyncAll,
    sendTimeUpdate,
    getConnectionStatus,
    isConnected: getConnectionStatus(),
  };
};
