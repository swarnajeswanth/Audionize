# Audionize Seek Functionality

## Overview

The seek functionality allows the host to control playback position and automatically syncs all connected clients. The system includes intelligent buffer management to ensure smooth playback even when seeking beyond the current buffer.

## 🎯 Host Controls

### Seek Capabilities

- **Full Control**: Host can seek to any position in the audio
- **Real-time Sync**: All clients are automatically synced to the new position
- **Visual Feedback**: Progress bar shows current position and allows clicking to seek
- **Client Count**: Shows how many clients are being synced

### How Host Seeking Works

1. **Click Progress Bar**: Host clicks anywhere on the progress bar
2. **Calculate Position**: System calculates the target time based on click position
3. **Immediate Seek**: Host audio immediately seeks to the new position
4. **Sync Clients**: Seek command is sent to all connected clients
5. **Feedback**: Toast notification shows seek position and client count

### Code Implementation

```javascript
const handleSeek = (time) => {
  if (!syncConnected) {
    toast.error("Not connected to sync server yet. Please wait.");
    return;
  }

  console.log(
    `[HOST] Seeking to ${time.toFixed(2)}s and syncing with ${
      connectedClients.length
    } clients`
  );

  // Send seek command to all clients
  sendSeek(time);

  // Seek immediately for host
  if (audioElementRef.current?.audio) {
    audioElementRef.current.audio.currentTime = time;
  }

  // Update local state immediately for responsive UI
  dispatch(setCurrentTime(time));

  // Show feedback to host
  if (connectedClients.length > 0) {
    toast.success(
      `Seeked to ${formatTime(time)} - syncing with ${
        connectedClients.length
      } clients`
    );
  } else {
    toast.info(`Seeked to ${formatTime(time)}`);
  }
};
```

## 🎧 Client Response

### Automatic Sync

- **Receive Commands**: Clients automatically receive seek commands from host
- **Buffer Management**: Intelligent buffer checking before seeking
- **Wait for Buffer**: If seeking beyond buffer, client waits for buffer to catch up
- **Visual Indicators**: Shows buffering status and progress

### Buffer Management

1. **Check Buffer**: Client checks if target position is within current buffer
2. **Safe Seek**: If within buffer, seek immediately
3. **Wait for Buffer**: If beyond buffer, wait for buffer to expand
4. **Retry Logic**: Periodically check buffer until safe to seek

### Code Implementation

```javascript
const handleSeekSync = (data, now, audio) => {
  const { currentTime } = data;
  console.log(
    `[CLIENT] Received seek command from host: ${currentTime.toFixed(2)}s`
  );

  // Check if we can seek safely
  const bufferEdge =
    audio.buffered.length > 0
      ? audio.buffered.end(audio.buffered.length - 1)
      : 0;

  if (currentTime <= bufferEdge) {
    // Safe to seek immediately
    audio.currentTime = currentTime;
    dispatch(setCurrentTime(currentTime));
    console.log(
      `[CLIENT] Safe seek to ${currentTime.toFixed(
        2
      )}s (buffer edge: ${bufferEdge.toFixed(2)}s)`
    );
  } else {
    // Need to wait for buffer
    console.log(
      `[CLIENT] Seek beyond buffer (${currentTime.toFixed(
        2
      )}s > ${bufferEdge.toFixed(2)}s), waiting...`
    );

    const waitForBuffer = () => {
      const newBufferEdge =
        audio.buffered.length > 0
          ? audio.buffered.end(audio.buffered.length - 1)
          : 0;
      if (currentTime <= newBufferEdge) {
        audio.currentTime = currentTime;
        dispatch(setCurrentTime(currentTime));
        console.log(
          `[CLIENT] Buffer caught up, seeking to ${currentTime.toFixed(2)}s`
        );
      } else {
        // Continue waiting
        setTimeout(waitForBuffer, 100);
      }
    };
    waitForBuffer();
  }
};
```

## 🎨 Visual Indicators

### Progress Bar

- **Host**: Clickable progress bar with hover effects
- **Client**: Non-clickable progress bar (controlled by host)
- **Buffer Fill**: Gray overlay shows buffered content
- **Progress Fill**: Blue gradient shows current position

### Buffer Status

- **Buffer Percentage**: Shows current buffer level
- **Waiting Indicator**: Yellow pulsing animation when waiting for buffer
- **Status Message**: "Buffering... X%" when waiting

### Code Implementation

```javascript
{
  /* Buffer Fill */
}
<div
  className="absolute top-0 left-0 h-full bg-slate-500/30 rounded-full"
  style={{ width: `${bufferedPercent}%` }}
></div>;

{
  /* Buffer Waiting Indicator */
}
{
  waitingForBuffer && !isHost && (
    <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse">
      <div className="absolute top-0 left-0 h-full bg-yellow-400/40 rounded-full animate-ping"></div>
    </div>
  );
}

{
  /* Buffer Info (for clients) */
}
{
  !isHost && audioUrl && (
    <div className="text-center text-xs text-slate-500 mt-1">
      Buffer: {bufferedPercent.toFixed(1)}%
      {waitingForBuffer && (
        <span className="text-yellow-400 ml-2">⏳ Waiting for buffer...</span>
      )}
    </div>
  );
}
```

## 🔧 Configuration

### Buffer Thresholds

- **Min Buffer**: 20% minimum buffer before playback
- **Buffer Increase**: +20% when seeking near buffer edge
- **Check Interval**: 100ms when waiting for buffer
- **Max Buffer**: 80% maximum buffer threshold

### Seek Behavior

- **Host**: Immediate seek with client sync
- **Client**: Buffer-aware seeking with wait logic
- **Feedback**: Toast notifications for host actions
- **Logging**: Detailed console logs for debugging

## 🚀 Benefits

### For Host

- **Full Control**: Complete control over playback position
- **Real-time Sync**: All clients follow host actions
- **Visual Feedback**: Clear indication of seek actions
- **Client Count**: Know how many clients are being synced

### For Clients

- **Automatic Sync**: No manual intervention needed
- **Buffer Safety**: Prevents seeking beyond available content
- **Visual Status**: Clear indication of buffering state
- **Smooth Playback**: Intelligent waiting for buffer

### For System

- **Reliability**: Buffer-aware seeking prevents errors
- **Performance**: Efficient buffer management
- **User Experience**: Smooth, responsive controls
- **Debugging**: Comprehensive logging for troubleshooting

## 🧪 Testing

### Test Scenarios

1. **Host Seeks Forward**: Verify clients follow and handle buffer
2. **Host Seeks Backward**: Verify immediate sync (usually safe)
3. **Buffer Edge Seeking**: Test seeking near buffer boundaries
4. **Multiple Clients**: Test with multiple connected clients
5. **Network Issues**: Test behavior with slow connections

### Expected Behavior

- **Host**: Immediate seek with client sync notification
- **Client**: Buffer check, wait if needed, then seek
- **Visual**: Progress bar updates, buffer indicators show status
- **Logs**: Console shows detailed seek and buffer information

## 🔮 Future Enhancements

### Planned Improvements

1. **Adaptive Buffering**: Dynamic buffer size based on network
2. **Seek Preview**: Show target position before seeking
3. **Batch Operations**: Multiple seek commands in sequence
4. **Buffer Prediction**: Predict buffer needs based on usage
5. **Seek History**: Track and replay seek patterns

### Performance Optimizations

- **Lazy Loading**: Load audio segments on demand
- **Pre-buffering**: Pre-load likely seek targets
- **Compression**: Optimize audio transfer for faster buffering
- **Caching**: Cache frequently accessed segments

## 📝 Troubleshooting

### Common Issues

#### Client Not Following Host Seeks

- Check network connectivity
- Verify client is connected to session
- Check console for error messages
- Ensure audio is loaded on client

#### Buffer Issues

- Check network speed
- Verify audio file size and format
- Monitor buffer percentage display
- Check for memory constraints

#### Seek Delays

- Monitor buffer waiting indicators
- Check network latency
- Verify audio loading progress
- Review console logs for timing

### Debug Commands

```bash
# Monitor sync server
npm run monitor

# Check client console logs
# Look for [CLIENT] and [HOST] messages

# Test seek functionality
# Host: Click progress bar at different positions
# Client: Watch buffer indicators and sync behavior
```

## 🎵 Conclusion

The seek functionality provides a robust, user-friendly way for hosts to control playback while ensuring all clients stay synchronized. The intelligent buffer management prevents playback issues while providing clear visual feedback to users.

The system balances responsiveness with reliability, making it suitable for both local and remote audio synchronization scenarios.
