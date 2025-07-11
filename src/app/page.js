"use client";
import { useRef, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuth, useAppDispatch } from "../store/hooks";
import { setUser, setSession, logout } from "../store/slices/authSlice";
import { setSessionCode } from "../store/slices/sessionSlice";
import HomePage from "../components/HomePage";
import HostPage from "../components/HostPage";
import SettingsPage from "../components/SettingsPage";
import AuthCheck from "../components/AuthCheck";
import LoadingState from "../components/LoadingState";
import NameInputModal from "../components/NameInputModal";

const PAGES = ["home", "host", "settings"];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Audionize() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const particlesRef = useRef();
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [joinError, setJoinError] = useState("");

  // Sync NextAuth session with Redux (but don't redirect)
  useEffect(() => {
    if (session) {
      dispatch(setSession(session));
      dispatch(setUser(session.user));
    } else if (status === "unauthenticated") {
      dispatch(logout());
    }
  }, [session, status, dispatch]);

  // Auto-join if ?code=SESSIONCODE is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        dispatch(setSessionCode(code));
        if (!isAuthenticated) {
          setPendingJoinCode(code);
          setShowNameModal(true);
        }
        // If authenticated, auto-join (handled by HomePage/Redux)
        setPage("home");
      }
    }
  }, [dispatch, isAuthenticated]);

  const handleJoinWithName = (name) => {
    // Here you would dispatch an action to join the session with the name
    // For now, just close the modal
    setShowNameModal(false);
    setJoinError("");
    // Example: dispatch(joinSessionWithName(pendingJoinCode, name));
  };

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Initializing..."
          size="large"
        />
      </div>
    );
  }

  // Page navigation
  const showPage = (id) => {
    setPage(id);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="relative overflow-x-hidden min-h-screen font-[Inter,sans-serif] text-slate-200">
      {/* Join Modal */}
      <NameInputModal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
        onSubmit={handleJoinWithName}
      />
      {/* Main app container */}
      <div className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="p-4 fixed w-full z-50 bg-slate-900/40 backdrop-blur-md border-b border-white/20 shadow-lg">
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
                Audionize
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
              {isAuthenticated ? (
                <div className="flex items-center space-x-4 ml-6">
                  <span className="text-slate-400 text-sm">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-slate-300 hover:text-white transition"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4 ml-6">
                  <button
                    onClick={() => router.push("/auth/signin")}
                    className="text-slate-300 hover:text-white transition"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push("/auth/signup")}
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white text-sm transition"
                  >
                    Sign Up
                  </button>
                </div>
              )}
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
            <div className="md:hidden bg-slate-800/60 backdrop-blur-md mt-2 rounded-lg p-4 border border-white/20">
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
                {isAuthenticated ? (
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <div className="text-slate-400 text-sm mb-2">
                      Welcome, {user?.name || user?.email}
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-slate-300 hover:text-white transition text-left"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <button
                      onClick={() => router.push("/auth/signin")}
                      className="text-slate-300 hover:text-white transition text-left mb-2"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => router.push("/auth/signup")}
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white text-sm transition w-full"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
        {/* Main content area */}
        <main className="flex-grow container mx-auto px-4 pt-24 pb-12">
          {page === "home" && <HomePage showPage={showPage} />}
          {page === "host" && (
            <AuthCheck>
              <HostPage />
            </AuthCheck>
          )}
          {page === "settings" && (
            <AuthCheck>
              <SettingsPage />
            </AuthCheck>
          )}
        </main>
        {/* Footer */}
        <footer className="p-4 text-center text-sm text-slate-400 bg-slate-900/70 border-t border-white/10">
          <div className="container mx-auto">
            <p>© 2023 Audionize. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
