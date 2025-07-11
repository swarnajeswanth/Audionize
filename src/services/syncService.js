import { io } from "socket.io-client";

class SyncService {
  constructor() {
    this.socket = null;
    this.sessionCode = null;
    this.role = null;
    this.userName = null;
    this.onMessageCallback = null;
    this.onClientUpdateCallback = null;
    this.onAudioUpdateCallback = null;
    this.isConnected = false;
  }

  connect(sessionCode, role, userName) {
    this.sessionCode = sessionCode;
    this.role = role;
    this.userName = userName;

    this.socket = io(
      process.env.NEXT_PUBLIC_IO_URL || "https://aduionize-socket.onrender.com",
      {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      }
    );

    this.socket.on("connect", () => {
      console.log("Connected to sync server");
      this.isConnected = true;

      // Join the session
      this.socket.emit("join", {
        session: sessionCode,
        role: role,
        name: userName,
      });
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from sync server");
      this.isConnected = false;
    });

    this.socket.on("user-joined", (data) => {
      if (this.onClientUpdateCallback) {
        this.onClientUpdateCallback({
          type: "joined",
          client: data,
        });
      }
    });
    this.socket.on("user-left", (data) => {
      if (this.onClientUpdateCallback) {
        this.onClientUpdateCallback({
          type: "left",
          clientId: data.id,
        });
      }
    });
    this.socket.on("audio-uploaded", (data) => {
      if (this.onAudioUpdateCallback) {
        this.onAudioUpdateCallback(data);
      }
    });
    this.socket.on("playback-action", (data) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    });
    this.socket.on("presence-update", (data) => {
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "presence-update", ...data });
      }
    });

    this.socket.on("error", (error) => {
      console.error("Sync service error:", error);
    });
  }

  // Send audio file to clients
  sendAudio(audioBlob, fileName, fileSize) {
    if (this.socket && this.isConnected) {
      this.socket.emit("audio-uploaded", {
        session: this.sessionCode,
        audioBlob,
        fileName,
        fileSize,
        timestamp: Date.now(),
      });
    }
  }

  // Send play command to clients
  sendPlaybackAction(action) {
    if (this.socket && this.isConnected) {
      this.socket.emit("playback-action", {
        session: this.sessionCode,
        ...action,
      });
    }
  }

  // Send pause command to clients
  sendPause() {
    if (this.socket && this.isConnected) {
      this.socket.emit("pause_command", {
        sessionCode: this.sessionCode,
        timestamp: Date.now(),
      });
    }
  }

  // Send seek command to clients
  sendSeek(currentTime) {
    if (this.socket && this.isConnected) {
      this.socket.emit("seek_command", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
        timestamp: Date.now(),
      });
    }
  }

  // Send volume command to clients
  sendVolume(volume) {
    if (this.socket && this.isConnected) {
      this.socket.emit("volume_command", {
        sessionCode: this.sessionCode,
        volume: volume,
        timestamp: Date.now(),
      });
    }
  }

  // Send sync all command to clients
  sendSyncAll(currentTime) {
    if (this.socket && this.isConnected) {
      this.socket.emit("sync_all_command", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
        timestamp: Date.now(),
      });
    }
  }

  // Send client time update to host
  sendTimeUpdate(currentTime) {
    if (this.socket && this.isConnected) {
      this.socket.emit("time_update", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
        timestamp: Date.now(),
      });
    }
  }

  // Set callbacks
  setOnMessage(callback) {
    this.onMessageCallback = callback;
  }

  setOnClientUpdate(callback) {
    this.onClientUpdateCallback = callback;
  }

  setOnAudioUpdate(callback) {
    this.onAudioUpdateCallback = callback;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

const syncService = new SyncService();
export default syncService;
