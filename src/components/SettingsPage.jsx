"use client";
import { useState } from "react";
export default function SettingsPage() {
  const [bufferSize, setBufferSize] = useState("Medium (Balanced)");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Settings
      </h1>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Network Settings</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Preferred Connection Method
          </label>
          <select className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Internet (WebSocket)</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sync Tolerance
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="200"
              defaultValue={50}
              className="w-full accent-blue-500"
            />
            <span className="text-sm w-16 text-right">50ms</span>
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
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Audio Settings</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Audio Output
          </label>
          <select className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Default</option>
            <option>Headphones</option>
            <option>Speakers</option>
            <option>Bluetooth Headset</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Buffer Size
          </label>
          <select
            className="bg-slate-700/50 border border-slate-600 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={bufferSize}
            onChange={(e) => setBufferSize(e.target.value)}
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
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button className="p-4 rounded-lg bg-slate-800 border-2 border-blue-500">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 mr-2"></div>
                <span>Ocean</span>
              </div>
            </button>
            <button className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/50 border border-slate-600">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-purple-500 mr-2"></div>
                <span>Purple</span>
              </div>
            </button>
            <button className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/50 border border-slate-600">
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
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>
      <div className="bg-slate-800/70 border border-white/10 p-6 rounded-xl mt-6">
        <h2 className="text-xl font-semibold mb-4">Diagnostics</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Connection Test
          </label>
          <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm">
            Run Tests
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Latency Measurement
          </label>
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Current:</span>
              <span className="text-sm font-mono">24ms</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Average:</span>
              <span className="text-sm font-mono">32ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Peak:</span>
              <span className="text-sm font-mono">86ms</span>
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
