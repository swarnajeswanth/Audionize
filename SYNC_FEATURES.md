# Audionize Real-time Audio Synchronization

## Overview

Audionize now supports real-time audio synchronization between multiple devices, allowing a host to control audio playback that syncs perfectly across all connected clients.

## Features

### 🎵 Host Controls

- **Audio Upload**: Host can upload audio files that are automatically shared with all clients
- **Play/Pause**: Host controls playback that syncs to all clients
- **Seek**: Host can seek to any position and all clients follow
- **Volume Control**: Host can adjust volume for all clients
- **Sync All**: Force synchronization of all clients to current position

### 👥 Client Features

- **Join Sessions**: Easy 6-digit code entry with paste support
- **Auto-Sync**: Automatically receives and plays audio from host
- **Real-time Updates**: All host actions are reflected immediately
- **Connection Status**: Visual indicators for connection health

### 🔗 Connection Methods

- **LAN Connection**: Fast, low-latency for devices on same network
- **Internet Connection**: Global access via web links
- **WebSocket/Socket.IO**: Real-time bidirectional communication

## How It Works

### 1. Host Setup

1. Navigate to "Host a Session"
2. A 6-digit session code is automatically generated
3. Share the join link or code with participants
4. Upload audio file (supports all browser audio formats)
5. Use player controls to sync with all clients

### 2. Client Join

1. Click "Join a Session" or use direct link
2. Enter 6-digit session code
3. Provide your name for identification
4. Wait for host to upload and start audio
5. Audio automatically syncs and plays

### 3. Synchronization

- **Audio Transfer**: Audio files are converted to blobs and shared via WebSocket
- **Command Sync**: All playback commands (play, pause, seek, volume) are broadcast
- **Time Sync**: Clients report their current time to host for monitoring
- **Real-time Updates**: Sub-second latency for seamless experience

## Technical Implementation

### Frontend Components

- `JoinSessionModal`: Handles session joining with validation
- `ClientPage`: Client-side audio player with sync
- `HostPage`: Enhanced host controls with real-time sync
- `SyncService`: WebSocket communication layer
- `useSyncService`: React hook for sync functionality

### Backend Services

- **WebSocket Server**: Handles LAN connections
- **Socket.IO Server**: Handles internet connections
- **Session Management**: Tracks active sessions and participants
- **Audio Broadcasting**: Efficient audio file sharing

### State Management

- **Redux Store**: Centralized state for audio, sync, and session data
- **Real-time Updates**: Automatic UI updates based on sync events
- **Connection Status**: Visual feedback for network health

## Usage Examples

### Host Workflow

```javascript
// Host uploads audio
const handleAudioUpload = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  sendSync({
    type: "audio_upload",
    audioBlob: arrayBuffer,
    fileName: file.name,
    timestamp: Date.now(),
  });
};

// Host plays audio
const handlePlay = () => {
  sendSync({
    type: "play",
    currentTime: audioRef.current.currentTime,
    timestamp: Date.now(),
  });
};
```

### Client Workflow

```javascript
// Client receives audio
const handleSync = (data) => {
  if (data.type === "audio_upload") {
    const url = URL.createObjectURL(new Blob([data.audioBlob]));
    dispatch(setAudioUrl(url));
  }
};

// Client receives play command
if (data.type === "play") {
  audioRef.current.currentTime = data.currentTime;
  audioRef.current.play();
}
```

## Security Features

- **Session Validation**: 6-digit codes prevent unauthorized access
- **Input Sanitization**: All user inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse of join/sync endpoints
- **CORS Protection**: Proper cross-origin resource sharing

## Performance Optimizations

- **Audio Compression**: Efficient blob transfer for audio files
- **Connection Pooling**: Reuses WebSocket connections
- **Debounced Updates**: Prevents excessive sync messages
- **Lazy Loading**: Components load only when needed

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Audio Support**: All browsers with HTML5 audio support
- **WebSocket Support**: Required for real-time sync
- **File API**: Required for audio upload and sharing

## Future Enhancements

- **Voice Chat**: Real-time voice communication
- **Playlist Support**: Multiple audio files in sequence
- **User Permissions**: Host can control client permissions
- **Recording**: Session recording and playback
- **Mobile Apps**: Native mobile applications
