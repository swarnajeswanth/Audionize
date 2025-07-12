import { io } from "socket.io-client";

class SyncService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.sessionCode = null;
    this.role = null;
    this.userName = null;
    this.onMessageCallback = null;
    this.onClientUpdateCallback = null;
    this.onAudioUpdateCallback = null;
    this.pingInterval = null;
    this.networkLatency = 0;
    this.clockOffset = 0;

    // Connection state management
    this.connectionPromise = null;
    this.pendingOperations = [];
    this.isConnecting = false;
  }

  // Health check method to test server accessibility
  async checkServerHealth() {
    // Skip health check if we're in a Node.js environment (server-side rendering)
    if (typeof window === "undefined") {
      console.log("Skipping health check in server environment");
      return {
        isHealthy: true,
        serverUrl:
          process.env.NEXT_PUBLIC_IO_URL ||
          "https://aduionize-socket.onrender.com",
      };
    }

    const primaryServerUrl =
      process.env.NEXT_PUBLIC_IO_URL || "https://aduionize-socket.onrender.com";
    const localServerUrl = "http://localhost:4000";
    const fallbackServerUrl = "https://your-fallback-server.onrender.com"; // Add your fallback server here

    // Determine which servers to try based on environment
    let servers = [primaryServerUrl];

    if (process.env.NODE_ENV === "development") {
      servers = [localServerUrl, primaryServerUrl, fallbackServerUrl];
    } else {
      servers = [primaryServerUrl, fallbackServerUrl];
    }

    for (const serverUrl of servers) {
      const healthUrl = serverUrl.replace("/socket.io", "");

      try {
        console.log(`Checking server health at: ${healthUrl}`);

        // Try with different approaches
        let response;

        // First try with CORS mode
        try {
          response = await fetch(healthUrl, {
            method: "GET",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (corsError) {
          console.log(`CORS failed for ${healthUrl}, trying without CORS`);

          // Try without CORS mode
          try {
            response = await fetch(healthUrl, {
              method: "GET",
              mode: "no-cors",
            });
          } catch (noCorsError) {
            console.log(`No-CORS also failed for ${healthUrl}`);
            continue; // Try next server
          }
        }

        if (response.ok || response.type === "opaque") {
          let data = "";
          try {
            data = await response.text();
          } catch (textError) {
            data = "Server responded (no-cors)";
          }
          console.log(`✅ Server health check passed for ${serverUrl}:`, data);
          return { isHealthy: true, serverUrl };
        } else {
          console.error(
            `❌ Server health check failed for ${serverUrl}:`,
            response.status,
            response.statusText
          );
        }
      } catch (error) {
        console.error(
          `❌ Server health check error for ${serverUrl}:`,
          error.message
        );

        // If it's a network error, try to connect directly with Socket.IO
        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")
        ) {
          console.log(`Attempting direct Socket.IO connection to ${serverUrl}`);
          return { isHealthy: true, serverUrl }; // Assume server is up if we can't fetch but can try Socket.IO
        }
      }
    }

    console.error("❌ All servers are not accessible");
    return { isHealthy: false, serverUrl: null };
  }

  async connect(sessionCode, role, userName) {
    // Skip connection if we're in a Node.js environment (server-side rendering)
    if (typeof window === "undefined") {
      console.log("Skipping connection in server environment");
      return;
    }

    // If already connecting, wait for that connection
    if (this.isConnecting && this.connectionPromise) {
      console.log("Already connecting, waiting for existing connection...");
      return this.connectionPromise;
    }

    // If already connected to the same session, return
    if (this.isConnected && this.sessionCode === sessionCode) {
      console.log("Already connected to this session");
      return Promise.resolve();
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    this.sessionCode = sessionCode;
    this.role = role;
    this.userName = userName;
    this.isConnecting = true;

    // Create connection promise
    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // Only use production server URL
        let serverUrl =
          process.env.NEXT_PUBLIC_IO_URL ||
          "https://aduionize-socket.onrender.com";

        // Ensure serverUrl has the correct format
        if (
          !serverUrl.startsWith("http://") &&
          !serverUrl.startsWith("https://")
        ) {
          serverUrl = `https://${serverUrl}`;
        }

        // Remove trailing slash if present
        serverUrl = serverUrl.replace(/\/$/, "");

        console.log(`Attempting to connect to sync server: ${serverUrl}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`NEXT_PUBLIC_IO_URL: ${process.env.NEXT_PUBLIC_IO_URL}`);

        // Try health check first, but don't fail if it doesn't work
        try {
          const healthCheck = await this.checkServerHealth();
          if (healthCheck.isHealthy) {
            console.log(
              `✅ Health check passed, using server: ${healthCheck.serverUrl}`
            );
          } else {
            console.log(
              `⚠️ Health check failed, but attempting Socket.IO connection anyway`
            );
          }
        } catch (healthError) {
          console.log(
            `⚠️ Health check error, but attempting Socket.IO connection anyway:`,
            healthError.message
          );
        }

        // Always try to connect with Socket.IO, even if health check failed
        console.log("Creating Socket.IO connection with options:", {
          serverUrl,
          path: "/socket.io",
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket = io(serverUrl, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          timeout: 20000, // 20 second timeout
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Connection event handlers
        if (!this.socket) {
          throw new Error("Socket not created");
        }

        // Set up connection event handlers
        this.setupConnectionHandlers(
          sessionCode,
          role,
          userName,
          resolve,
          reject
        );
      } catch (error) {
        console.error("❌ Connection setup failed:", error);
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  setupConnectionHandlers(sessionCode, role, userName, resolve, reject) {
    const connectionTimeout = setTimeout(() => {
      console.error("❌ Connection timeout");
      this.isConnecting = false;
      this.connectionPromise = null;
      reject(new Error("Connection timeout"));
    }, 30000); // 30 second timeout

    this.socket.on("connect", () => {
      console.log("✅ Connected to sync server successfully");
      clearTimeout(connectionTimeout);
      this.isConnected = true;
      this.isConnecting = false;

      // Start ping-pong for latency measurement
      this.startLatencyMeasurement();

      // Join the session
      this.socket.emit("join", {
        session: sessionCode,
        role: role,
        name: userName,
      });

      // Process any pending operations
      this.processPendingOperations();

      resolve();
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      clearTimeout(connectionTimeout);
      this.isConnecting = false;
      this.connectionPromise = null;
      this.isConnected = false;
      reject(error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from sync server:", reason);
      this.isConnected = false;

      if (reason === "io server disconnect") {
        // Server disconnected us, try to reconnect
        console.log("Server disconnected, attempting to reconnect...");
        this.socket.connect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;

      // Re-join the session after reconnection
      this.socket.emit("join", {
        session: sessionCode,
        role: role,
        name: userName,
      });
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after all attempts");
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

    this.socket.on("sync_all_command", (data) => {
      console.log("Received sync all command:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "sync_all", ...data });
      }
    });

    this.socket.on("time_update", (data) => {
      console.log("Received time update:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "time_update", ...data });
      }
    });

    this.socket.on("sync", (data) => {
      console.log("Received sync:", data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: "sync", ...data });
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

  // Queue operation for when connection is ready
  queueOperation(operation) {
    if (this.isConnected && this.socket) {
      // Execute immediately if connected
      try {
        operation();
      } catch (error) {
        console.error("Error executing operation:", error);
      }
    } else {
      // Queue for later execution
      console.log("Queueing operation, waiting for connection...", {
        isConnected: this.isConnected,
        hasSocket: !!this.socket,
        pendingCount: this.pendingOperations.length + 1,
      });
      this.pendingOperations.push(operation);
    }
  }

  // Process pending operations after connection
  processPendingOperations() {
    console.log(
      `Processing ${this.pendingOperations.length} pending operations`
    );
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      try {
        operation();
        console.log("Successfully executed queued operation");
      } catch (error) {
        console.error("Error executing queued operation:", error);
      }
    }
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
    this.queueOperation(() => {
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
    });
  }

  // Enhanced play command with better timing
  sendPlay(scheduledTime = 0, currentTime = 0) {
    this.queueOperation(() => {
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
    });
  }

  // Send pause command to clients (with currentTime for sync)
  sendPause(currentTime = 0) {
    this.queueOperation(() => {
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
    });
  }

  // Send seek command to clients
  sendSeek(currentTime) {
    this.queueOperation(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit("seek_command", {
          sessionCode: this.sessionCode,
          currentTime: currentTime,
          timestamp: Date.now(),
        });
      }
    });
  }

  // Send volume command to clients
  sendVolume(volume) {
    this.queueOperation(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit("volume_command", {
          sessionCode: this.sessionCode,
          volume: volume,
          timestamp: Date.now(),
        });
      }
    });
  }

  // Send sync all command to clients
  sendSyncAll(currentTime) {
    this.queueOperation(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit("sync_all_command", {
          sessionCode: this.sessionCode,
          currentTime: currentTime,
          timestamp: Date.now(),
        });
      }
    });
  }

  // Send client time update to host
  sendTimeUpdate(currentTime) {
    this.queueOperation(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit("time_update", {
          sessionCode: this.sessionCode,
          currentTime: currentTime,
          timestamp: Date.now(),
        });
      }
    });
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
    // Skip disconnect if we're in a Node.js environment (server-side rendering)
    if (typeof window === "undefined") {
      console.log("Skipping disconnect in server environment");
      return;
    }

    // Clear pending operations
    this.pendingOperations = [];
    this.isConnecting = false;
    this.connectionPromise = null;

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
    // Return false if we're in a Node.js environment (server-side rendering)
    if (typeof window === "undefined") {
      return false;
    }
    return this.isConnected && this.socket !== null;
  }

  // Check if service is ready to accept operations
  isReady() {
    return this.getConnectionStatus() && this.sessionCode && this.role;
  }

  // Get detailed connection info for debugging
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      hasSocket: !!this.socket,
      sessionCode: this.sessionCode,
      role: this.role,
      userName: this.userName,
      isConnecting: this.isConnecting,
      pendingOperations: this.pendingOperations.length,
      networkLatency: this.networkLatency,
      clockOffset: this.clockOffset,
    };
  }
}

const syncService = new SyncService();
export default syncService;
