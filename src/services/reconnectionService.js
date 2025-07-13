import syncService from "./syncService";
import toast from "react-hot-toast";

class ReconnectionService {
  constructor() {
    this.reconnectAttempts = 0;
    this.maxAttempts = 5;
    this.baseReconnectDelay = 2000;
    this.isReconnecting = false;
    this.currentSession = null;
    this.currentRole = null;
    this.currentUserName = null;
    this.reconnectTimeout = null;
    this.listeners = [];
  }

  // Initialize the service with session details
  initialize(sessionCode, role, userName) {
    this.currentSession = sessionCode;
    this.currentRole = role;
    this.currentUserName = userName;
    this.reconnectAttempts = 0;
  }

  // Subscribe to reconnection events
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify listeners of state changes
  notifyListeners(event, data) {
    this.listeners.forEach((listener) => listener(event, data));
  }

  // Attempt reconnection with exponential backoff
  async reconnect() {
    if (this.isReconnecting) {
      console.log("Reconnection already in progress, skipping...");
      return false;
    }

    if (!this.currentSession || !this.currentRole || !this.currentUserName) {
      console.error("Cannot reconnect: missing session details");
      return false;
    }

    this.isReconnecting = true;
    this.notifyListeners("reconnecting", {
      attempts: this.reconnectAttempts + 1,
    });

    console.log(
      `Attempting reconnection (attempt ${this.reconnectAttempts + 1}/${
        this.maxAttempts
      })`
    );

    for (
      let attempt = this.reconnectAttempts + 1;
      attempt <= this.maxAttempts;
      attempt++
    ) {
      try {
        console.log(`Reconnection attempt ${attempt}/${this.maxAttempts}`);

        await syncService.connect(
          this.currentSession,
          this.currentRole,
          this.currentUserName
        );

        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.notifyListeners("reconnected", { attempt });

        console.log(`Successfully reconnected on attempt ${attempt}`);
        toast.success("Reconnected to session!");

        return true;
      } catch (error) {
        console.error(`Reconnection attempt ${attempt} failed:`, error);
        this.reconnectAttempts = attempt;

        if (attempt < this.maxAttempts) {
          const delay = this.baseReconnectDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Waiting ${delay}ms before next attempt...`);

          this.notifyListeners("reconnect_failed", {
            attempt,
            error,
            nextAttemptIn: delay,
          });

          await new Promise((resolve) => {
            this.reconnectTimeout = setTimeout(resolve, delay);
          });
        }
      }
    }

    this.isReconnecting = false;
    this.notifyListeners("reconnect_failed_final", {
      attempts: this.reconnectAttempts,
    });

    console.error(`Failed to reconnect after ${this.maxAttempts} attempts`);
    toast.error("Failed to reconnect. Please try joining the session again.");

    return false;
  }

  // Handle disconnection events
  handleDisconnect(reason) {
    console.log("Handling disconnect:", reason);

    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Don't attempt reconnection for manual disconnects
    if (reason === "io client disconnect") {
      console.log("Manual disconnect detected, not attempting reconnection");
      this.notifyListeners("disconnected_manual", { reason });
      return;
    }

    // Don't attempt reconnection if we're already reconnecting
    if (this.isReconnecting) {
      console.log("Already reconnecting, ignoring disconnect event");
      return;
    }

    // Don't attempt reconnection if we don't have session details
    if (!this.currentSession || !this.currentRole || !this.currentUserName) {
      console.log("No session details available, not attempting reconnection");
      this.notifyListeners("disconnected_no_session", { reason });
      return;
    }

    // Attempt reconnection after a short delay
    console.log("Scheduling reconnection attempt...");
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect();
    }, 1000);
  }

  // Handle connection success
  handleConnect() {
    console.log("Connection established successfully");
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.notifyListeners("connected", {});
  }

  // Handle connection errors
  handleConnectError(error) {
    console.error("Connection error:", error);
    this.notifyListeners("connect_error", { error });
  }

  // Handle reconnection success
  handleReconnect(attemptNumber) {
    console.log(`Reconnected after ${attemptNumber} attempts`);
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.notifyListeners("reconnected", { attemptNumber });
  }

  // Handle reconnection errors
  handleReconnectError(error) {
    console.error("Reconnection error:", error);
    this.notifyListeners("reconnect_error", { error });
  }

  // Handle reconnection failure
  handleReconnectFailed() {
    console.error("Reconnection failed after all attempts");
    this.isReconnecting = false;
    this.notifyListeners("reconnect_failed_final", {});
  }

  // Manual reconnection trigger
  async triggerReconnection() {
    if (this.isReconnecting) {
      console.log("Reconnection already in progress");
      return false;
    }

    return this.reconnect();
  }

  // Cancel any pending reconnection
  cancelReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isReconnecting = false;
    this.notifyListeners("reconnection_cancelled", {});
  }

  // Clean up the service
  cleanup() {
    this.cancelReconnection();
    this.currentSession = null;
    this.currentRole = null;
    this.currentUserName = null;
    this.reconnectAttempts = 0;
    this.listeners = [];
  }

  // Get current status
  getStatus() {
    return {
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxAttempts,
      currentSession: this.currentSession,
      currentRole: this.currentRole,
      currentUserName: this.currentUserName,
      hasReconnectTimeout: !!this.reconnectTimeout,
    };
  }
}

// Create singleton instance
const reconnectionService = new ReconnectionService();

export default reconnectionService;
