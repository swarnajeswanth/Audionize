"use client";
import { useState, useEffect } from "react";
import AnimatedModal from "./AnimatedModal";
import { useAppDispatch } from "../store/hooks";
import { setSessionCode, setIsClient } from "../store/slices/sessionSlice";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function JoinSessionModal({
  isOpen,
  onClose,
  sessionCode: initialCode = "",
}) {
  const [sessionCode, setSessionCodeState] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }

    if (sessionCode.length !== 6) {
      toast.error("Session code must be 6 digits");
      return;
    }

    setIsJoining(true);

    try {
      // Set session state (but don't connect to sync server yet)
      dispatch(setSessionCode(sessionCode.trim()));
      dispatch(setIsClient(true));

      toast.success("Joining session...");

      // Close modal and redirect to client view
      onClose();
      router.push(`/client?code=${sessionCode}`);
    } catch (error) {
      console.error("Failed to join session:", error);
      toast.error("Failed to join session. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.length === 6 && /^\d+$/.test(text)) {
        setSessionCodeState(text);
        toast.success("Session code pasted!");
      } else {
        toast.error("Invalid session code in clipboard");
      }
    } catch (error) {
      toast.error("Could not read from clipboard");
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} title="Join Session">
      <form onSubmit={handleJoin} className="space-y-6">
        <div>
          <label
            htmlFor="sessionCode"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Session Code
          </label>
          <div className="flex space-x-2">
            <input
              id="sessionCode"
              type="text"
              value={sessionCode}
              onChange={(e) =>
                setSessionCodeState(e.target.value.toUpperCase())
              }
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg tracking-wider"
              required
            />
            <button
              type="button"
              onClick={handlePaste}
              className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Paste
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Ask the host for the 6-digit session code
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {isJoining && (
            <div className="flex items-center text-blue-400 text-sm">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              Joining session...
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isJoining || !(sessionCode || "").trim()}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isJoining || !(sessionCode || "").trim()
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isJoining ? "Joining Session..." : "Join Session"}
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
