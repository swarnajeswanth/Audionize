import { useState } from "react";
import AnimatedModal from "./AnimatedModal";

export default function FeatureSelectionModal({ isOpen, onClose, onSelect }) {
  const [selectedFeature, setSelectedFeature] = useState("");

  const handleSelect = () => {
    if (selectedFeature) {
      onSelect(selectedFeature);
      onClose();
    }
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Connection Type"
    >
      <div className="space-y-6">
        <p className="text-gray-300 text-sm">
          Choose how you want to share your audio session:
        </p>

        {/* LAN Option */}
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedFeature === "lan"
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-600 bg-slate-800/40 hover:border-slate-500"
          }`}
          onClick={() => setSelectedFeature("lan")}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                selectedFeature === "lan"
                  ? "border-blue-500 bg-blue-500"
                  : "border-slate-400"
              }`}
            >
              {selectedFeature === "lan" && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">LAN Connection</h3>
              <p className="text-slate-400 text-sm">
                Share with devices on the same WiFi network
              </p>
              <div className="mt-2 text-xs text-slate-500">
                • Fast, low-latency connection
                <br />
                • No internet required
                <br />• 6-digit code for easy joining
              </div>
            </div>
          </div>
        </div>

        {/* Internet Option */}
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedFeature === "internet"
              ? "border-purple-500 bg-purple-500/10"
              : "border-slate-600 bg-slate-800/40 hover:border-slate-500"
          }`}
          onClick={() => setSelectedFeature("internet")}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                selectedFeature === "internet"
                  ? "border-purple-500 bg-purple-500"
                  : "border-slate-400"
              }`}
            >
              {selectedFeature === "internet" && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">Internet Connection</h3>
              <p className="text-slate-400 text-sm">
                Share with anyone, anywhere in the world
              </p>
              <div className="mt-2 text-xs text-slate-500">
                • Global access via web link
                <br />
                • Host approval system
                <br />• Requires internet connection
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedFeature}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              selectedFeature
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}
