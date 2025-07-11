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
    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

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
      console.log("Received audio upload:", data);
      if (this.onAudioUpdateCallback) {
        this.onAudioUpdateCallback(data);
      }
    });

    // Add handler for audio_sync events from server
    this.socket.on("audio_sync", (data) => {
      console.log("Received audio_sync from server:", data);
      if (this.onAudioUpdateCallback) {
        this.onAudioUpdateCallback(data);
      }
    });

    // Add handlers for individual playback commands
    this.socket.on("play_command", (data) => {
      console.log("Received play command:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "play", ...data });
      }
    });

    this.socket.on("pause_command", (data) => {
      console.log("Received pause command:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "pause", ...data });
      }
    });

    this.socket.on("seek_command", (data) => {
      console.log("Received seek command:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "seek", ...data });
      }
    });

    this.socket.on("volume_command", (data) => {
      console.log("Received volume command:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "volume", ...data });
      }
    });

    this.socket.on("playback-action", (data) => {
      console.log("Received playback action:", data);
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
      console.log("Sending audio to clients:", { fileName, fileSize });
      this.socket.emit("audio_upload", {
        sessionCode: this.sessionCode,
        audioBlob,
        fileName,
        fileSize,
        timestamp: Date.now(),
      });
    } else {
      console.error("Cannot send audio: socket not connected");
    }
  }

  // Send play command to clients
  sendPlay(currentTime = 0) {
    if (this.socket && this.isConnected) {
      console.log("Sending play command:", { currentTime });
      this.socket.emit("play_command", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
        timestamp: Date.now(),
      });
    } else {
      console.error("Cannot send play command: socket not connected");
    }
  }

  // Send pause command to clients
  sendPause() {
    if (this.socket && this.isConnected) {
      console.log("Sending pause command");
      this.socket.emit("pause_command", {
        sessionCode: this.sessionCode,
        timestamp: Date.now(),
      });
    } else {
      console.error("Cannot send pause command: socket not connected");
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
    return this.isConnected && this.socket !== null;
  }
}

const syncService = new SyncService();
export default syncService;
