"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Activity, Loader2, Shield, Zap, BarChart3, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-10 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />

        {/* Mesh overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Dental Lab Mate Pro</h2>
              <p className="text-indigo-200 text-sm">Professional Lab Management</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6">
            Streamline Your<br />
            Dental Lab Workflow
          </h1>
          <p className="text-lg text-indigo-100 mb-10 leading-relaxed max-w-md">
            Manage cases, track orders, handle billing, and grow your dental lab business with our all-in-one platform.
          </p>

          {/* Feature items */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Fast Case Tracking</p>
                <p className="text-sm text-indigo-200">Real-time updates from received to delivered</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Financial Insights</p>
                <p className="text-sm text-indigo-200">Complete billing and payment management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Secure & Reliable</p>
                <p className="text-sm text-indigo-200">Enterprise-grade security for your data</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">WhatsApp Integration</p>
                <p className="text-sm text-indigo-200">Instant messaging with dentists</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-4">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Dental Lab Mate Pro</h1>
            <p className="text-muted-foreground mt-2">Professional Lab Management Software</p>
          </div>

          {/* Login Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1">Sign in to continue</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-4 rounded-xl text-center mb-6">
                {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-muted transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span className="font-semibold text-foreground">
                {loading ? "Signing in..." : "Sign in with Google"}
              </span>
            </button>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">secure authentication</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed mt-6">
              By signing in, you agree to use this application in accordance with your organization&apos;s policies.
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Powered by Dental Lab Mate Pro
          </p>
        </div>
      </div>
    </div>
  );
}
