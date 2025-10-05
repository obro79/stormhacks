"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [name, setName] = useState("");
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
          Sign Up
        </h1>
      </div>

      <div className="w-full max-w-md bg-neutral-800 rounded p-6">
        <div className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white text-base">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 h-12 rounded"
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white h-12 rounded"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-neutral-700 hover:text-white h-14 rounded font-medium text-base transition duration-200 ease-in-out"
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
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded font-medium text-base"
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
            <span className="text-neutral-400 text-sm">
              Already have an account?{" "}
            </span>
            <a
              href="/sign-in"
              className="text-sm text-sky-500 hover:text-sky-400"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
