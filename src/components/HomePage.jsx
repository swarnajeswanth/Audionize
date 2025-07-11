"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function HomePage({ showPage }) {
  const waveRef = useRef();
  useEffect(() => {
    if (!waveRef.current) return;
    const spans = waveRef.current.querySelectorAll("span");
    gsap.to(spans, {
      scaleY: 2,
      repeat: -1,
      yoyo: true,
      stagger: 0.1,
      duration: 0.75,
      ease: "sine.inOut",
      delay: 0.1,
    });
    return () => gsap.killTweensOf(spans);
  }, []);
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div
        ref={waveRef}
        className="flex justify-center items-center gap-2 mb-8 h-24"
      >
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className="block w-2 md:w-2.5 h-10 md:h-16 bg-gradient-to-t from-blue-500 to-purple-500 rounded-lg"
          />
        ))}
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Audionize
      </h1>
      <p className="text-xl md:text-2xl text-slate-300 mb-12">
        Synchronized audio playback across multiple devices
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
        <button
          onClick={() => showPage("host")}
          className="bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 transition-all transform hover:scale-105 p-6 rounded-xl flex flex-col items-center justify-center border border-white/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-blue-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold mb-2">Host a Session</h3>
          <p className="text-slate-400">
            Start playback and sync with other devices
          </p>
        </button>
      </div>
      <div className="mt-16 bg-slate-800/40 backdrop-blur-md border border-white/20 p-6 rounded-xl max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4">
            <div className="bg-slate-700/30 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center mb-3">
              <span className="text-lg font-bold">1</span>
            </div>
            <p className="text-center">
              Host starts a session and selects audio
            </p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="bg-slate-700/30 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center mb-3">
              <span className="text-lg font-bold">2</span>
            </div>
            <p className="text-center">
              Guests join using a link with a session code
            </p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="bg-slate-700/30 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center mb-3">
              <span className="text-lg font-bold">3</span>
            </div>
            <p className="text-center">
              Perfectly synchronized playback begins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
