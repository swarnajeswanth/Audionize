"use client";
import { useRef, useState } from "react";
import HomePage from "../components/HomePage";
import HostPage from "../components/HostPage";
import JoinPage from "../components/JoinPage";
import SettingsPage from "../components/SettingsPage";

const PAGES = ["home", "host", "join", "settings"];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SyncSound() {
  const [page, setPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const particlesRef = useRef();

  // Page navigation
  const showPage = (id) => {
    setPage(id);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="relative overflow-x-hidden min-h-screen font-[Inter,sans-serif] bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200">
      {/* Floating particles */}
      <div ref={particlesRef} className="fixed inset-0 -z-10" />
      {/* Main app container */}
      <div className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="p-4 fixed w-full z-50 bg-slate-900/70 backdrop-blur border-b border-white/10 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Logo */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                SyncSound
              </span>
            </div>
            <div className="hidden md:flex space-x-6">
              {PAGES.map((p) => (
                <button
                  key={p}
                  onClick={() => showPage(p)}
                  className={classNames(
                    "text-slate-300 hover:text-white transition",
                    page === p && "font-bold text-white"
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="md:hidden text-slate-300"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-800/90 mt-2 rounded-lg p-4">
              <div className="flex flex-col space-y-3">
                {PAGES.map((p) => (
                  <button
                    key={p}
                    onClick={() => showPage(p)}
                    className={classNames(
                      "text-slate-300 hover:text-white transition text-left",
                      page === p && "font-bold text-white"
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
        {/* Main content area */}
        <main className="flex-grow container mx-auto px-4 pt-24 pb-12">
          {page === "home" && <HomePage showPage={showPage} />}
          {page === "host" && <HostPage />}
          {page === "join" && <JoinPage />}
          {page === "settings" && <SettingsPage />}
        </main>
        {/* Footer */}
        <footer className="p-4 text-center text-sm text-slate-400 bg-slate-900/70 border-t border-white/10">
          <div className="container mx-auto">
            <p>© 2023 SyncSound. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
