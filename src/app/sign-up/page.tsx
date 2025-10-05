"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
  setLoading(true);
  setMessage("");

  // Strip every possible quote or space
  const cleanEmail = email
    .trim()
    .replaceAll('"', "")
    .replaceAll("'", "")
    .replace(/[<>]/g, ""); // avoid stray HTML paste chars
  const cleanPassword = password.trim();

  console.log("Email being sent to Supabase:", cleanEmail);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    setMessage("Please enter a valid email address.");
    setLoading(false);
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (error) {
    console.error("Signup error:", error.message);
    setMessage(error.message);
    setLoading(false);
    return;
  }

  console.log("Signup success:", data);
  setMessage("Signup successful! Check your email for confirmation.");
  setLoading(false);
};



  const handleGoogleSignUp = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const handleAppleSignUp = async () => {
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white h-12 rounded-lg"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-100 h-14 rounded-xl font-medium text-base"
          >
            {loading ? "Creating account..." : "Continue"}
          </Button>

          {/* Feedback */}
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

          {/* OAuth */}
          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded-xl font-medium text-base"
          >
            Continue with Google
          </Button>

          <Button
            onClick={handleAppleSignUp}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded-xl font-medium text-base"
          >
            Continue with Apple
          </Button>

          {/* Sign In link */}
          <div className="text-center pt-4">
            <span className="text-neutral-400">Already have an account? </span>
            <a href="/sign-in" className="text-cyan-500 hover:text-cyan-400">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
