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

    // Enhanced sync properties
    this.networkLatency = 0;
    this.clockOffset = 0;
    this.syncTolerance = 100; // milliseconds
    this.lastPingTime = 0;
    this.pingInterval = null;
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

      // Start ping-pong for latency measurement
      this.startLatencyMeasurement();

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

    // Handle host disconnection
    this.socket.on("host_disconnect", (data) => {
      console.log("Host disconnected - room closed:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({
          type: "host_disconnect",
          message: "Host has disconnected. Room closed.",
          ...data,
        });
      }
    });

    // Add latency measurement handler
    this.socket.on("pong", (data) => {
      const now = Date.now();
      const roundTripTime = now - data.sentTime;
      this.networkLatency = roundTripTime / 2; // One-way latency
      this.clockOffset = data.serverTime - (now - this.networkLatency);
      console.log(
        `Network latency: ${this.networkLatency}ms, Clock offset: ${this.clockOffset}ms`
      );
    });
  }

  // Start periodic latency measurement
  startLatencyMeasurement() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit("ping", { sentTime: Date.now() });
      }
    }, 5000); // Ping every 5 seconds
  }

  // Get synchronized timestamp
  getSyncTimestamp() {
    return Date.now() + this.clockOffset;
  }

  // Calculate optimal play delay based on network conditions
  calculatePlayDelay() {
    const baseDelay = 1000; // 1 second base delay
    const latencyBuffer = this.networkLatency * 2; // Double the latency for safety
    const jitterBuffer = 200; // Additional buffer for network jitter
    return Math.max(baseDelay, latencyBuffer + jitterBuffer);
  }

  // Send audio file to clients
  sendAudio(audioBuffer, fileName, fileSize, fileType) {
    if (this.socket && this.isConnected) {
      console.log("Sending audio to clients:", { fileName, fileSize });
      this.socket.emit("audio_upload", {
        sessionCode: this.sessionCode,
        audioBuffer, // ArrayBuffer
        fileName,
        fileSize,
        fileType, // pass the type
        timestamp: Date.now(),
      });
    } else {
      console.error("Cannot send audio: socket not connected");
    }
  }

  // Enhanced play command with better timing
  sendPlay(scheduledTime = 0, currentTime = 0) {
    if (this.socket && this.isConnected) {
      const playDelay = this.calculatePlayDelay();
      const actualScheduledTime =
        scheduledTime || this.getSyncTimestamp() + playDelay;

      console.log("Sending play command:", {
        scheduledTime: actualScheduledTime,
        currentTime,
        playDelay,
        networkLatency: this.networkLatency,
      });

      this.socket.emit("play_command", {
        sessionCode: this.sessionCode,
        scheduledTime: actualScheduledTime,
        currentTime: currentTime,
        timestamp: this.getSyncTimestamp(),
        networkLatency: this.networkLatency,
      });
    } else {
      console.error("Cannot send play command: socket not connected");
    }
  }

  // Send pause command to clients (with currentTime for sync)
  sendPause(currentTime = 0) {
    if (this.socket && this.isConnected) {
      console.log("Sending pause command:", { currentTime });
      this.socket.emit("pause_command", {
        sessionCode: this.sessionCode,
        currentTime: currentTime,
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
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket && this.isConnected) {
      // If this is a host disconnecting, emit room closure event
      if (this.role === "host") {
        console.log("Host disconnecting - closing room for all clients");
        this.socket.emit("host_disconnect", {
          sessionCode: this.sessionCode,
          timestamp: Date.now(),
        });
      }

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionCode = null;
      this.role = null;
      this.userName = null;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected && this.socket !== null;
  }
}

const syncService = new SyncService();
export default syncService;
