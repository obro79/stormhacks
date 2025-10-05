"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-900">
      <div className="w-[100px] h-[100px]">
        <Link href="/">
          <Image
            src="/microphone.webp"
            objectFit="cover"
            alt="EchoMe Logo"
            height={150}
            width={150}
          />
        </Link>
      </div>

      <div className="my-6">
        <h1 className="text-2xl text-white tracking-tight font-semibold leading-none">
          Sign In
        </h1>
      </div>

      <div className="w-full max-w-md bg-neutral-800 rounded p-6">
        <div className="space-y-4">
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
              className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 h-12 rounded"
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
              className="bg-neutral-700 border-neutral-600 text-white h-12 rounded"
            />
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-neutral-700 hover:text-white h-14 rounded font-medium text-base transition duration-200 ease-in-out"
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
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded font-medium text-base"
          >
            <svg className="w-10 h-10" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Apple Sign In */}
          <Button
            onClick={handleAppleSignIn}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded-xl font-medium text-base"
          >
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </Button>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <span className="text-neutral-400">
              Don&apos;t have an account?{" "}
            </span>
            <a href="/sign-up" className="text-cyan-500 hover:text-cyan-400">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
