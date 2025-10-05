"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    // Clean and validate email
    const cleanEmail = email
      .trim()
      .replaceAll('"', "")
      .replaceAll("'", "")
      .replace(/[<>]/g, "");
    const cleanPassword = password.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      console.error("Sign-in error:", error.message);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("Signed in:", data);
    setMessage("Successfully signed in!");
    setLoading(false);

    // Optional: redirect after login (Next.js example)
    // window.location.href = "/dashboard";
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const handleAppleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: "apple" });
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-800 rounded-3xl p-8">
        <div className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white text-base">
              Email<span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Your email address."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 h-12 rounded-lg"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white text-base">
              Password<span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white h-12 rounded-lg"
            />
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-100 h-14 rounded-xl font-medium text-base"
          >
            {loading ? "Signing in..." : "Continue"}
          </Button>

          {/* Message */}
          {message && (
            <p className="text-center text-neutral-400 text-sm pt-2">
              {message}
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-neutral-600"></div>
            <span className="text-neutral-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-neutral-600"></div>
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded-xl font-medium text-base"
          >
            Continue with Google
          </Button>

          {/* Apple Sign In */}
          <Button
            onClick={handleAppleSignIn}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded-xl font-medium text-base"
          >
            Continue with Apple
          </Button>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <span className="text-neutral-400">Don&apos;t have an account? </span>
            <a href="/sign-up" className="text-cyan-500 hover:text-cyan-400">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
