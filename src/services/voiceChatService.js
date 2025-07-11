import { io } from "socket.io-client";

class VoiceChatService {
  constructor() {
    this.socket = null;
    this.sessionCode = null;
    this.userId = null;
    this.onMessageCallback = null;
    this.onParticipantUpdateCallback = null;
  }

  connect(sessionCode, userId, name = "Guest") {
    this.sessionCode = sessionCode;
    this.userId = userId;
    this.socket = io(
      process.env.NEXT_PUBLIC_IO_URL || "https://aduionize-socket.onrender.com",
      { path: "/socket.io" }
    );
    this.socket.emit("join", { session: sessionCode, role: "client", name });

    this.socket.on("voice_data", (data) =>
      this.handleMessage({ ...data, type: "voice_data" })
    );
    this.socket.on("speaker_update", (data) =>
      this.handleMessage({ ...data, type: "speaker_update" })
    );
    this.socket.on("participant_joined", (data) =>
      this.handleParticipantJoined(data)
    );
    this.socket.on("participant_left", (data) =>
      this.handleParticipantLeft(data)
    );
    this.socket.on("volume_update", (data) =>
      this.handleMessage({ ...data, type: "volume_update" })
    );
    this.socket.on("mute_update", (data) =>
      this.handleMessage({ ...data, type: "mute_update" })
    );
    this.socket.on("permission_update", (data) =>
      this.handleMessage({ ...data, type: "permission_update" })
    );
  }

  handleMessage(data) {
    if (this.onMessageCallback) {
      this.onMessageCallback(data);
    }
  }

  handleParticipantJoined(data) {
    if (this.onParticipantUpdateCallback) {
      this.onParticipantUpdateCallback({
        type: "joined",
        participant: data.participant,
      });
    }
  }

  handleParticipantLeft(data) {
    if (this.onParticipantUpdateCallback) {
      this.onParticipantUpdateCallback({ type: "left", userId: data.userId });
    }
  }

  sendVoiceData(audioBlob) {
    if (this.socket) {
      const reader = new FileReader();
      reader.onload = () => {
        this.socket.emit("voice_data", {
          audioBlob: reader.result,
          userId: this.userId,
          sessionCode: this.sessionCode,
          timestamp: Date.now(),
        });
      };
      reader.readAsDataURL(audioBlob);
    }
  }

  sendSpeakerUpdate(isSpeaking, volume = 0) {
    if (this.socket) {
      this.socket.emit("speaker_update", {
        userId: this.userId,
        sessionCode: this.sessionCode,
        isSpeaking,
        volume,
        timestamp: Date.now(),
      });
    }
  }

  sendVolumeUpdate(volume) {
    if (this.socket) {
      this.socket.emit("volume_update", {
        userId: this.userId,
        sessionCode: this.sessionCode,
        volume,
        timestamp: Date.now(),
      });
    }
  }

  sendMuteUpdate(isMuted) {
    if (this.socket) {
      this.socket.emit("mute_update", {
        userId: this.userId,
        sessionCode: this.sessionCode,
        isMuted,
        timestamp: Date.now(),
      });
    }
  }

  sendPermissionUpdate(userId, canSpeak) {
    if (this.socket) {
      this.socket.emit("permission_update", {
        userId,
        canSpeak,
        sessionCode: this.sessionCode,
        timestamp: Date.now(),
      });
    }
  }

  sendMessage(message) {
    if (this.socket) {
      this.socket.emit("custom_message", {
        ...message,
        sessionCode: this.sessionCode,
      });
    }
  }

  setOnMessage(callback) {
    this.onMessageCallback = callback;
  }

  setOnParticipantUpdate(callback) {
    this.onParticipantUpdateCallback = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getConnectionState() {
    return this.socket ? this.socket.connected : false;
  }
}

const voiceChatService = new VoiceChatService();
export default voiceChatService;
