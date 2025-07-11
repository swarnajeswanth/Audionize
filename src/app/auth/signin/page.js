"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/slices/userSlice";

export default function SignIn() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Load remembered credentials on component mount
  useEffect(() => {
    const stored = localStorage.getItem("audionize_user");
    if (stored) {
      const userData = JSON.parse(stored);
      if (userData.rememberCredentials) {
        setEmail(userData.email || "");
        setPassword(userData.password || "");
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      // Save credentials if remember me is checked
      dispatch(setCredentials({ email, password, remember: rememberMe }));

      toast.success("Signed in successfully!");
      // Check for callback URL
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get("callbackUrl");
      router.push(callbackUrl || "/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Sign in to your Audionize account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-300"
            >
              Remember my credentials
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-8 p-4 bg-blue-900/20 backdrop-blur-sm rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-200">
            <strong>Demo Account:</strong>
            <br />
            Email: admin@audionize.com
            <br />
            Password: password
          </p>
        </div>
      </div>
    </div>
  );
}
