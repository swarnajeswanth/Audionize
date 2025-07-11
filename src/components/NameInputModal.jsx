import { useState } from "react";
import AnimatedModal from "./AnimatedModal";

export default function NameInputModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate name
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (name.trim().length > 20) {
      setError("Name must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(name.trim())) {
      setError("Name can only contain letters, numbers, and spaces");
      return;
    }

    setError("");
    onSubmit(name.trim());
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} title="Join Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="Your name"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Join Session
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
