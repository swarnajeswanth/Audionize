"use client";

import { useAuth } from "../store/hooks";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import { clearCredentials } from "../store/slices/userSlice";
import { signOut } from "next-auth/react";

export default function AuthCheck({ children, fallback = null }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    // Clear remembered credentials
    dispatch(clearCredentials());
    // Clear auth state
    dispatch(logout());
    // Sign out from NextAuth
    await signOut({ redirect: false });
    router.push("/");
  };

  if (!isAuthenticated) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="max-w-2xl mx-auto mt-24 bg-slate-800/80 border border-white/10 p-8 rounded-xl flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Authentication Required
        </h2>
        <p className="text-slate-300 mb-6 text-center">
          You must be signed in to access this feature.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/auth/signin")}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded text-white font-semibold"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/auth/signup")}
            className="bg-slate-600 hover:bg-slate-700 px-6 py-3 rounded text-white font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
      <div className="fixed top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
