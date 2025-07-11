"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSession, useSync, useAppDispatch } from "../store/hooks";
import { setSessionCode, setMode } from "../store/slices/sessionSlice";
import { setConnected, setIsHost } from "../store/slices/syncSlice";
import { useLanSync } from "../hooks/useLanSync";
import { useInternetSync } from "../hooks/useInternetSync";
import { toast } from "react-hot-toast";
import LoadingState from "./LoadingState";
import NameInputModal from "./NameInputModal";
import VoiceChat from "./VoiceChat";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { sessionCode, mode } = useSession();
  const { isConnected, connectedClients } = useSync();

  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // Get session info from URL params
  const sessionParam = searchParams.get("session");
  const codeParam = searchParams.get("code");
  const typeParam = searchParams.get("type");
  const ipParam = searchParams.get("ip");

  useEffect(() => {
    // Determine connection type and set up session
    if (codeParam && typeParam === "lan") {
      // LAN connection via QR code
      dispatch(setSessionCode(codeParam));
      dispatch(setMode("lan"));
      setShowNameModal(true);
    } else if (sessionParam && ipParam) {
      // Internet connection via link
      if (!isAuthenticated) {
        toast.error("Please log in to join this session");
        router.push("/login");
        return;
      }
      dispatch(setSessionCode(sessionParam));
      dispatch(setMode("internet"));
      setShowNameModal(true);
    } else {
      // Manual join - show input form
      setShowNameModal(true);
    }
  }, [
    codeParam,
    sessionParam,
    typeParam,
    ipParam,
    isAuthenticated,
    dispatch,
    router,
  ]);

  // Sync hooks
  const lanSync = useLanSync(sessionCode, "client", (data) => {
    console.log("[LAN] Received:", data);
  });

  const internetSync = useInternetSync(sessionCode, "client", (data) => {
    console.log("[Internet] Received:", data);
  });

  const handleNameSubmit = async (name) => {
    setUserName(name);
    setIsConnecting(true);
    setConnectionError("");

    try {
      // Set up connection based on mode
      if (mode === "lan") {
        await lanSync.connect();
        dispatch(setConnected(true));
        dispatch(setIsHost(false));
        toast.success("Connected to LAN session!");
      } else {
        await internetSync.connect();
        dispatch(setConnected(true));
        dispatch(setIsHost(false));
        toast.success("Connected to Internet session!");
      }

      setShowNameModal(false);
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionError("Failed to connect to session. Please try again.");
      toast.error("Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualJoin = (code, connectionType) => {
    dispatch(setSessionCode(code));
    dispatch(setMode(connectionType));
    setShowNameModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Join Session
      </h1>

      {/* Manual Join Form */}
      {!sessionCode && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Join Session
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Code
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Connection Type
              </label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="lan">LAN (Same Network)</option>
                <option value="internet">Internet (Anywhere)</option>
              </select>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors">
              Join Session
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {sessionCode && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {mode === "lan" ? "LAN Session" : "Internet Session"}
          </h2>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Session Code:</span>
              <span className="text-slate-300 font-mono">{sessionCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Status:</span>
              <span
                className={`${
                  isConnected ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {isConnected ? "Connected" : "Connecting..."}
              </span>
            </div>
            {userName && (
              <div className="flex justify-between">
                <span className="text-slate-300">Your Name:</span>
                <span className="text-slate-300">{userName}</span>
              </div>
            )}
          </div>

          {connectionError && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
              {connectionError}
            </div>
          )}
        </div>
      )}

      {/* Connected Devices List */}
      {isConnected && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Connected Devices
          </h3>
          {connectedClients.length === 0 ? (
            <p className="text-gray-400 text-sm">No other devices connected</p>
          ) : (
            <div className="space-y-2">
              {connectedClients.map((client, idx) => (
                <div
                  key={client.userId || idx}
                  className="flex items-center space-x-3 bg-slate-800/60 rounded p-2"
                >
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium">
                      {client.name || client.userId}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {client.isHost ? "(Host)" : "(Client)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Name Input Modal */}
      <NameInputModal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
        onSubmit={handleNameSubmit}
      />

      {/* Loading State */}
      <LoadingState
        loading={isConnecting}
        error={connectionError}
        success={isConnected}
        size="small"
      />

      {/* Voice Chat */}
      {isConnected && <VoiceChat sessionCode={sessionCode} mode={mode} />}
    </div>
  );
}
