import { EventEmitter } from "events";

class ConnectionStateManager extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: "disconnected", // disconnected, connecting, connected, error, reconnecting
      isReconnecting: false,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      connectionQuality: "unknown", // unknown, poor, fair, good, excellent
      latency: null,
      sessionCode: null,
      role: null,
      userName: null,
      error: null,
      hostDisconnected: false,
      waitingForHost: false,
    };

    this.listeners = [];
    this.connectionStartTime = null;
    this.connectionDuration = 0;
  }

  // Set connection state
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Update timestamps
    if (newState.status === "connected" && oldState.status !== "connected") {
      this.state.lastConnectedAt = Date.now();
      this.connectionStartTime = Date.now();
    }

    if (
      newState.status === "disconnected" &&
      oldState.status !== "disconnected"
    ) {
      this.state.lastDisconnectedAt = Date.now();
      if (this.connectionStartTime) {
        this.connectionDuration = Date.now() - this.connectionStartTime;
      }
    }

    // Emit state change event
    this.emit("stateChange", this.state, oldState);

    // Notify listeners
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);

    // Immediately call with current state
    listener(this.state);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error("Error in connection state listener:", error);
      }
    });
  }

  // Initialize connection
  initialize(sessionCode, role, userName) {
    this.setState({
      sessionCode,
      role,
      userName,
      status: "connecting",
      error: null,
      reconnectAttempts: 0,
      isReconnecting: false,
    });
  }

  // Set connected state
  setConnected() {
    this.setState({
      status: "connected",
      isReconnecting: false,
      reconnectAttempts: 0,
      error: null,
      hostDisconnected: false,
      waitingForHost: false,
    });
  }

  // Set disconnected state
  setDisconnected(reason = null) {
    this.setState({
      status: "disconnected",
      error: reason,
      hostDisconnected: false,
      waitingForHost: false,
    });
  }

  // Set reconnecting state
  setReconnecting(attempts = 0) {
    this.setState({
      status: "reconnecting",
      isReconnecting: true,
      reconnectAttempts: attempts,
      error: null,
    });
  }

  // Set error state
  setError(error) {
    this.setState({
      status: "error",
      error,
      isReconnecting: false,
    });
  }

  // Set host disconnected state
  setHostDisconnected(waiting = true) {
    this.setState({
      hostDisconnected: true,
      waitingForHost: waiting,
      status: "disconnected",
    });
  }

  // Update connection quality
  updateConnectionQuality(latency) {
    this.state.latency = latency;

    let quality = "unknown";
    if (latency !== null) {
      if (latency < 50) quality = "excellent";
      else if (latency < 100) quality = "good";
      else if (latency < 200) quality = "fair";
      else quality = "poor";
    }

    this.setState({
      connectionQuality: quality,
      latency,
    });
  }

  // Increment reconnect attempts
  incrementReconnectAttempts() {
    this.setState({
      reconnectAttempts: this.state.reconnectAttempts + 1,
    });
  }

  // Reset reconnect attempts
  resetReconnectAttempts() {
    this.setState({
      reconnectAttempts: 0,
      isReconnecting: false,
    });
  }

  // Get connection duration
  getConnectionDuration() {
    if (this.state.status === "connected" && this.connectionStartTime) {
      return Date.now() - this.connectionStartTime;
    }
    return this.connectionDuration;
  }

  // Get formatted connection duration
  getFormattedConnectionDuration() {
    const duration = this.getConnectionDuration();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Check if connection is stable
  isConnectionStable() {
    if (this.state.status !== "connected") return false;

    const duration = this.getConnectionDuration();
    return duration > 30000; // Consider stable after 30 seconds
  }

  // Get connection health score (0-100)
  getConnectionHealthScore() {
    let score = 0;

    // Base score from status
    switch (this.state.status) {
      case "connected":
        score += 60;
        break;
      case "connecting":
        score += 30;
        break;
      case "reconnecting":
        score += 20;
        break;
      case "disconnected":
        score += 10;
        break;
      case "error":
        score += 0;
        break;
    }

    // Add score from connection quality
    switch (this.state.connectionQuality) {
      case "excellent":
        score += 40;
        break;
      case "good":
        score += 30;
        break;
      case "fair":
        score += 20;
        break;
      case "poor":
        score += 10;
        break;
      default:
        score += 20;
    }

    // Deduct score for reconnect attempts
    score -= this.state.reconnectAttempts * 5;

    return Math.max(0, Math.min(100, score));
  }

  // Get connection status summary
  getStatusSummary() {
    const healthScore = this.getConnectionHealthScore();
    const duration = this.getFormattedConnectionDuration();

    return {
      status: this.state.status,
      healthScore,
      duration,
      quality: this.state.connectionQuality,
      latency: this.state.latency,
      reconnectAttempts: this.state.reconnectAttempts,
      isStable: this.isConnectionStable(),
      hostDisconnected: this.state.hostDisconnected,
      waitingForHost: this.state.waitingForHost,
    };
  }

  // Clean up the manager
  cleanup() {
    this.setState({
      status: "disconnected",
      sessionCode: null,
      role: null,
      userName: null,
      error: null,
      isReconnecting: false,
      reconnectAttempts: 0,
      hostDisconnected: false,
      waitingForHost: false,
    });

    this.listeners = [];
    this.connectionStartTime = null;
    this.connectionDuration = 0;
  }

  // Get current state
  getState() {
    return { ...this.state };
  }
}

// Create singleton instance
const connectionStateManager = new ConnectionStateManager();

export default connectionStateManager;
