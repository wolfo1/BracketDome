"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Tab = "signin" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("signin");

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);
    try {
      const result = await signIn("credentials", {
        email: signInEmail,
        password: signInPassword,
        redirect: false,
      });
      if (result?.error) {
        setSignInError("Invalid email or password.");
      } else {
        router.push("/");
      }
    } catch {
      setSignInError("Something went wrong. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error ?? "Registration failed.");
        return;
      }
      const result = await signIn("credentials", {
        email: regEmail,
        password: regPassword,
        redirect: false,
      });
      if (result?.error) {
        setRegError("Account created, but sign-in failed. Try logging in.");
      } else {
        router.push("/");
      }
    } catch {
      setRegError("Something went wrong. Please try again.");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo / heading */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-2 block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-black tracking-tight text-transparent"
          >
            🏆 BracketDome
          </Link>
          <p className="text-sm text-gray-500">
            Tournament brackets for your WhatsApp group
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 shadow-2xl shadow-black/50">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              className={`flex-1 rounded-tl-2xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                activeTab === "signin"
                  ? "bg-gray-800/60 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 rounded-tr-2xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                activeTab === "register"
                  ? "bg-gray-800/60 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            {/* ── Sign In Tab ── */}
            {activeTab === "signin" && (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signin-email"
                    className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signin-password"
                    className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                  >
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {signInError && (
                  <p className="rounded-lg border border-red-800/50 bg-red-900/30 px-3 py-2 text-sm text-red-400">
                    {signInError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={signInLoading}
                  className="mt-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signInLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

            {/* ── Create Account Tab ── */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-name"
                    className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                  >
                    Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-email"
                    className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                  >
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-password"
                    className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {regError && (
                  <p className="rounded-lg border border-red-800/50 bg-red-900/30 px-3 py-2 text-sm text-red-400">
                    {regError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="mt-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {regLoading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          <Link href="/" className="text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
