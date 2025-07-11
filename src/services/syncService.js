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

    this.socket.on("client_joined", (data) => {
      console.log("Client joined:", data);
      if (this.onClientUpdateCallback) {
        this.onClientUpdateCallback({
          type: "joined",
          client: data,
        });
      }
    });

    this.socket.on("client_left", (data) => {
      console.log("Client left:", data);
      if (this.onClientUpdateCallback) {
        this.onClientUpdateCallback({
          type: "left",
          clientId: data.clientId,
        });
      }
    });

    this.socket.on("audio_sync", (data) => {
      console.log("Audio sync received:", data);
      if (this.onAudioUpdateCallback) {
        this.onAudioUpdateCallback(data);
      }
    });

    this.socket.on("play_command", (data) => {
      console.log("Play command received:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "play",
          currentTime: data.currentTime,
          timestamp: data.timestamp,
        });
      }
    });

    this.socket.on("pause_command", (data) => {
      console.log("Pause command received:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "pause",
          timestamp: data.timestamp,
        });
      }
    });

    this.socket.on("seek_command", (data) => {
      console.log("Seek command received:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "seek",
          currentTime: data.currentTime,
          timestamp: data.timestamp,
        });
      }
    });

    this.socket.on("volume_command", (data) => {
      console.log("Volume command received:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "volume",
          volume: data.volume,
          timestamp: data.timestamp,
        });
      }
    });

    this.socket.on("sync_all_command", (data) => {
      console.log("Sync all command received:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "sync_all",
          currentTime: data.currentTime,
          timestamp: data.timestamp,
        });
      }
    });

    this.socket.on("error", (error) => {
      console.error("Sync service error:", error);
    });
  }

  // Send audio file to clients
  sendAudio(audioBlob, fileName, fileSize) {
    if (this.socket && this.isConnected) {
      this.socket.emit("audio_upload", {
        sessionCode: this.sessionCode,
        audioBlob: audioBlob,
        fileName: fileName,
        fileSize: fileSize,
        timestamp: Date.now(),
      });
    }
  }

  // Send play command to clients
  sendPlay(currentTime = 0) {
    if (this.socket && this.isConnected) {
      this.socket.emit("play_command", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
        timestamp: Date.now(),
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
