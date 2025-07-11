"use client";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useApi } from "../hooks/useApi";
import { useSyncService } from "../hooks/useSyncService";
import {
  setSyncTolerance,
  setAutoReconnect,
  setNormalizeVolume,
  setBufferSize,
} from "../store/slices/syncSlice";
import { setTheme, setDarkMode } from "../store/slices/userSlice";
import toast from "react-hot-toast";
import LoadingState from "./LoadingState";

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { getNetworkStatus, getServerInfo } = useApi();

  // Get current state from Redux
  const syncTolerance = useAppSelector(
    (state) => state.sync.syncTolerance || 50
  );
  const autoReconnect = useAppSelector(
    (state) => state.sync.autoReconnect !== false
  );
  const normalizeVolume = useAppSelector(
    (state) => state.sync.normalizeVolume || false
  );
  const bufferSize = useAppSelector(
    (state) => state.sync.bufferSize || "Medium (Balanced)"
  );
  const theme = useAppSelector((state) => state.user.theme || "ocean");
  const darkMode = useAppSelector((state) => state.user.darkMode !== false);
  const isConnected = useAppSelector((state) => state.sync.isConnected);
  const syncStatus = useAppSelector((state) => state.sync.syncStatus);

  // Local state
  const [networkLatency, setNetworkLatency] = useState({
    current: 0,
    average: 0,
    peak: 0,
  });
  const [serverInfo, setServerInfo] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("default");

  // Load audio devices on mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const audioOutputs = devices.filter(
            (device) => device.kind === "audiooutput"
          );
          setAudioDevices(audioOutputs);
        })
        .catch((err) => console.error("Error loading audio devices:", err));
    }
  }, []);

  // Test connection and get latency
  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const startTime = performance.now();
      const networkStatus = await getNetworkStatus();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      setNetworkLatency((prev) => ({
        current: latency,
        average: Math.round((prev.average + latency) / 2),
        peak: Math.max(prev.peak, latency),
      }));

      toast.success(`Connection test completed! Latency: ${latency}ms`);
    } catch (error) {
      toast.error("Connection test failed");
      console.error("Connection test error:", error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get server information
  const loadServerInfo = async () => {
    try {
      const info = await getServerInfo();
      setServerInfo(info);
    } catch (error) {
      console.error("Failed to load server info:", error);
    }
  };

  useEffect(() => {
    loadServerInfo();
  }, []);

  // Handle sync tolerance change
  const handleSyncToleranceChange = (value) => {
    dispatch(setSyncTolerance(parseInt(value)));
    toast.success(`Sync tolerance set to ${value}ms`);
  };

  // Handle auto-reconnect toggle
  const handleAutoReconnectToggle = (checked) => {
    dispatch(setAutoReconnect(checked));
    toast.success(`Auto-reconnect ${checked ? "enabled" : "disabled"}`);
  };

  // Handle normalize volume toggle
  const handleNormalizeVolumeToggle = (checked) => {
    dispatch(setNormalizeVolume(checked));
    toast.success(`Volume normalization ${checked ? "enabled" : "disabled"}`);
  };

  // Handle buffer size change
  const handleBufferSizeChange = (value) => {
    dispatch(setBufferSize(value));
    toast.success(`Buffer size set to ${value}`);
  };

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    dispatch(setTheme(newTheme));
    toast.success(`Theme changed to ${newTheme}`);
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = (checked) => {
    dispatch(setDarkMode(checked));
    toast.success(`Dark mode ${checked ? "enabled" : "disabled"}`);
  };

  // Handle audio device change
  const handleAudioDeviceChange = (deviceId) => {
    setSelectedAudioDevice(deviceId);
    toast.success("Audio output device changed");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Settings
      </h1>

      {/* Connection Status */}
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Status</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isConnected
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="text-xs text-slate-400 capitalize">{syncStatus}</p>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Current Latency</span>
              <span className="text-sm font-mono">
                {networkLatency.current}ms
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(networkLatency.current / 2, 100)}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Server</span>
              <span className="text-xs text-slate-400">
                {serverInfo?.version || "v1.0.0"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {serverInfo?.status || "Unknown"}
            </p>
          </div>
        </div>
        <button
          onClick={testConnection}
          disabled={isTestingConnection}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 px-4 py-2 rounded text-sm transition-colors"
        >
          {isTestingConnection ? "Testing..." : "Test Connection"}
        </button>
      </div>

      {/* Network Settings */}
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Network Settings</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Preferred Connection Method
          </label>
          <select className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Internet (WebSocket)</option>
            <option>LAN (WebSocket)</option>
            <option>Auto-detect</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sync Tolerance: {syncTolerance}ms
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="200"
              value={syncTolerance}
              onChange={(e) => handleSyncToleranceChange(e.target.value)}
              className="w-full accent-blue-500"
            />
            <span className="text-sm w-16 text-right">{syncTolerance}ms</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Higher values may reduce sync interruptions but increase latency
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Auto-reconnect
            </label>
            <p className="text-xs text-slate-400">
              Attempt to reconnect if connection drops
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoReconnect}
              onChange={(e) => handleAutoReconnectToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Audio Settings</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Audio Output
          </label>
          <select
            value={selectedAudioDevice}
            onChange={(e) => handleAudioDeviceChange(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="default">Default</option>
            {audioDevices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Audio Output ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Buffer Size
          </label>
          <select
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={bufferSize}
            onChange={(e) => handleBufferSizeChange(e.target.value)}
          >
            <option>Small (Faster sync, may stutter)</option>
            <option>Medium (Balanced)</option>
            <option>Large (Smoother, more latency)</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Normalize Volume
            </label>
            <p className="text-xs text-slate-400">
              Adjust volume levels automatically
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={normalizeVolume}
              onChange={(e) => handleNormalizeVolumeToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleThemeChange("ocean")}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === "ocean"
                  ? "bg-slate-800 border-blue-500"
                  : "bg-slate-800 hover:bg-slate-700/50 border-slate-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 mr-2"></div>
                <span>Ocean</span>
              </div>
            </button>
            <button
              onClick={() => handleThemeChange("purple")}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === "purple"
                  ? "bg-slate-800 border-purple-500"
                  : "bg-slate-800 hover:bg-slate-700/50 border-slate-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-purple-500 mr-2"></div>
                <span>Purple</span>
              </div>
            </button>
            <button
              onClick={() => handleThemeChange("emerald")}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === "emerald"
                  ? "bg-slate-800 border-emerald-500"
                  : "bg-slate-800 hover:bg-slate-700/50 border-slate-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-500 mr-2"></div>
                <span>Emerald</span>
              </div>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Dark Mode
            </label>
            <p className="text-xs text-slate-400">Use dark theme</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => handleDarkModeToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mt-6">
        <h2 className="text-xl font-semibold mb-4">Diagnostics</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Latency Measurement
          </label>
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Current:</span>
              <span className="text-sm font-mono">
                {networkLatency.current}ms
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Average:</span>
              <span className="text-sm font-mono">
                {networkLatency.average}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Peak:</span>
              <span className="text-sm font-mono">{networkLatency.peak}ms</span>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Server Information
          </label>
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Version:</span>
              <span className="text-sm font-mono">
                {serverInfo?.version || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Status:</span>
              <span className="text-sm font-mono">
                {serverInfo?.status || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Uptime:</span>
              <span className="text-sm font-mono">
                {serverInfo?.uptime || "Unknown"}
              </span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            App Version
          </label>
          <p className="text-sm">Audionize v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
