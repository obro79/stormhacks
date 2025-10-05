"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    console.log("Sign up with:", { email, password });
  };

  const handleGoogleSignUp = () => {
    console.log("Sign up with Google");
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-700 border-neutral-600 text-white h-12 rounded"
            />
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-white text-black hover:bg-neutral-700 hover:text-white h-14 rounded font-medium text-base transition duration-200 ease-in-out"
          >
            Continue
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-neutral-600"></div>
            <span className="text-neutral-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-neutral-600"></div>
          </div>

          {/* Google Sign up */}
          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full bg-transparent border-neutral-600 text-white hover:bg-neutral-700 h-14 rounded font-medium text-base"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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

          {/* Sign Up Link */}
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
