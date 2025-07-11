import { apiHelpers } from "../lib/axios";

class VoiceChatService {
  constructor() {
    this.ws = null;
    this.sessionCode = null;
    this.userId = null;
    this.onMessageCallback = null;
    this.onParticipantUpdateCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Connect to voice chat WebSocket
  connect(sessionCode, userId, serverUrl = null) {
    this.sessionCode = sessionCode;
    this.userId = userId;

    const wsUrl = serverUrl || `ws://${window.location.hostname}:4001/voice`;
    const fullUrl = `${wsUrl}?session=${sessionCode}&userId=${userId}`;

    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        console.log("Voice chat WebSocket connected");
        this.reconnectAttempts = 0;
        this.sendMessage({
          type: "join",
          sessionCode,
          userId,
          timestamp: Date.now(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Failed to parse voice chat message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(
          "Voice chat WebSocket disconnected:",
          event.code,
          event.reason
        );
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error("Voice chat WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create voice chat WebSocket:", error);
      throw error;
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    switch (data.type) {
      case "voice_data":
        this.handleVoiceData(data);
        break;
      case "speaker_update":
        this.handleSpeakerUpdate(data);
        break;
      case "participant_joined":
        this.handleParticipantJoined(data);
        break;
      case "participant_left":
        this.handleParticipantLeft(data);
        break;
      case "volume_update":
        this.handleVolumeUpdate(data);
        break;
      case "mute_update":
        this.handleMuteUpdate(data);
        break;
      case "permission_update":
        if (this.onMessageCallback) {
          this.onMessageCallback({
            type: "permission_update",
            userId: data.userId,
            canSpeak: data.canSpeak,
          });
        }
        break;
      default:
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
    }
  }

  // Handle voice data from other participants
  handleVoiceData(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback({
        type: "voice_data",
        audioBlob: data.audioBlob,
        userId: data.userId,
        timestamp: data.timestamp,
      });
    }
  }

  // Handle speaker status updates
  handleSpeakerUpdate(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback({
        type: "speaker_update",
        userId: data.userId,
        isSpeaking: data.isSpeaking,
        volume: data.volume,
      });
    }
  }

  // Handle participant joining
  handleParticipantJoined(data) {
    if (this.onParticipantUpdateCallback) {
      this.onParticipantUpdateCallback({
        type: "joined",
        participant: data.participant,
      });
    }
  }

  // Handle participant leaving
  handleParticipantLeft(data) {
    if (this.onParticipantUpdateCallback) {
      this.onParticipantUpdateCallback({
        type: "left",
        userId: data.userId,
      });
    }
  }

  // Handle volume updates
  handleVolumeUpdate(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback({
        type: "volume_update",
        userId: data.userId,
        volume: data.volume,
      });
    }
  }

  // Handle mute updates
  handleMuteUpdate(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback({
        type: "mute_update",
        userId: data.userId,
        isMuted: data.isMuted,
      });
    }
  }

  // Send voice data to other participants
  sendVoiceData(audioBlob) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Convert blob to base64 for WebSocket transmission
      const reader = new FileReader();
      reader.onload = () => {
        this.sendMessage({
          type: "voice_data",
          audioBlob: reader.result,
          userId: this.userId,
          sessionCode: this.sessionCode,
          timestamp: Date.now(),
        });
      };
      reader.readAsDataURL(audioBlob);
    }
  }

  // Send speaker status update
  sendSpeakerUpdate(isSpeaking, volume = 0) {
    this.sendMessage({
      type: "speaker_update",
      userId: this.userId,
      sessionCode: this.sessionCode,
      isSpeaking,
      volume,
      timestamp: Date.now(),
    });
  }

  // Send volume update
  sendVolumeUpdate(volume) {
    this.sendMessage({
      type: "volume_update",
      userId: this.userId,
      sessionCode: this.sessionCode,
      volume,
      timestamp: Date.now(),
    });
  }

  // Send mute status update
  sendMuteUpdate(isMuted) {
    this.sendMessage({
      type: "mute_update",
      userId: this.userId,
      sessionCode: this.sessionCode,
      isMuted,
      timestamp: Date.now(),
    });
  }

  // Send permission update (host only)
  sendPermissionUpdate(userId, canSpeak) {
    this.sendMessage({
      type: "permission_update",
      userId,
      canSpeak,
      sessionCode: this.sessionCode,
      timestamp: Date.now(),
    });
  }

  // Send generic message
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
    }
  }

  // Handle disconnection with reconnection logic
  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect voice chat (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect(this.sessionCode, this.userId);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached for voice chat");
    }
  }

  // Set message callback
  setOnMessage(callback) {
    this.onMessageCallback = callback;
  }

  // Set participant update callback
  setOnParticipantUpdate(callback) {
    this.onParticipantUpdateCallback = callback;
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionCode = null;
    this.userId = null;
    this.onMessageCallback = null;
    this.onParticipantUpdateCallback = null;
  }

  // Check connection status
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState() {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
        return "closed";
      default:
        return "unknown";
    }
  }
}

// Create singleton instance
const voiceChatService = new VoiceChatService();

export default voiceChatService;
