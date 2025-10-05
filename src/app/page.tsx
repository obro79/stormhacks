"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, Plus } from "lucide-react";

import Link from "next/link";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    sandboxUrl?: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    console.log("🚀 Submit button clicked!");
    console.log("📝 Prompt:", prompt);

    setLoading(true);
    setResult(null);

    try {
      console.log("🔄 Calling API /api/init...");
      const response = await fetch("/api/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      console.log("✅ API response received:", data);

      if (data.sandboxUrl) {
        console.log("🔗 Preview link:", data.sandboxUrl);
      }

      setResult(data);
    } catch (error) {
      console.error("❌ Error calling API:", error);
      setResult({
        success: false,
        message: "Failed to generate app. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const featuredProjects = [
    {
      name: "Landing Page",
      gradient: "linear-gradient(135deg, #4B5563 0%, #1F2937 100%)",
      dotColor: "#4B5563",
    },
    {
      name: "Website",
      gradient: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
      dotColor: "#6366F1",
    },
    {
      name: "Portfolio",
      gradient: "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",
      dotColor: "#F97316",
    },
    {
      name: "Blog",
      gradient: "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
      dotColor: "#6B7280",
    },
    {
      name: "Ecommerce",
      gradient: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
      dotColor: "#3B82F6",
    },
    {
      name: "Photography",
      gradient: "linear-gradient(135deg, #EA580C 0%, #D97706 100%)",
      dotColor: "#EA580C",
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "#222222" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded" />
          <span className="text-xl font-medium">EchoMe</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center bg-[#282924] text-white w-[5.4375rem] h-[2.8125rem] rounded font-medium"
            style={{
              fontSize: "1rem",
              fontStyle: "normal",
              fontWeight: 500,
              lineHeight: "normal",
              letterSpacing: "-0.03rem",
            }}
          >
            Login
          </Link>

          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center bg-white text-black w-[7.625rem] h-[2.8125rem] rounded font-medium"
            style={{
              fontSize: "1rem",
              fontStyle: "normal",
              fontWeight: 500,
              lineHeight: "normal",
              letterSpacing: "-0.03rem",
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center space-y-6">
          <h1
            style={{
              color: "#FFF",
              textAlign: "center",
              fontFamily: "Geist",
              fontSize: "4rem",
              fontStyle: "normal",
              fontWeight: 500,
              lineHeight: "normal",
              letterSpacing: "-0.2rem",
            }}
          >
            Build applications by talking.
          </h1>

          <div
            className="space-y-1 mx-auto"
            style={{
              width: "52.25rem",
              color: "#FFF",
              textAlign: "center",
              fontFamily: "Geist",
              fontSize: "1.5rem",
              fontStyle: "normal",
              fontWeight: 600,
              lineHeight: "normal",
              letterSpacing: "-0.045rem",
            }}
          >
            <p>Describe what you want.</p>
            <p>Watch it come to life.</p>
            <p>No typing required.</p>
          </div>

          {/* Input Area */}
          <div className="pt-8 flex justify-center">
            <div
              className="relative p-4"
              style={{
                width: "38.75rem",
                height: "8.8125rem",
                borderRadius: "1.5625rem",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#282924",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app. For example: A task tracker with dark mode and Google login."
                className="w-full h-full bg-transparent border-0 outline-none text-white placeholder:text-gray-500 text-sm resize-none"
                style={{ outline: "none", boxShadow: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="absolute bottom-4 left-4">
                <button
                  className="hover:opacity-80 rounded-full transition-colors flex items-center justify-center"
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    flexShrink: 0,
                    background: "#3C3C3C",
                  }}
                >
                  <Plus
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      flexShrink: 0,
                      color: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                  />
                </button>
              </div>
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  className="hover:opacity-80 rounded-full transition-colors flex items-center justify-center"
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    flexShrink: 0,
                    background: "#3C3C3C",
                  }}
                >
                  <Mic
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      flexShrink: 0,
                      color: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                  />
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || loading}
                  size="icon"
                  className="rounded-full hover:opacity-80 flex items-center justify-center text-white"
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    flexShrink: 0,
                    background: "#3C3C3C",
                  }}
                >
                  <ArrowRight
                    className="text-white"
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      flexShrink: 0,
                      strokeWidth: 1.5,
                    }}
                  />
                </Button>
              </div>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div
              className={`rounded-lg p-6 mt-6 ${
                result.success
                  ? "bg-green-900/20 border border-green-700"
                  : "bg-red-900/20 border border-red-700"
              }`}
            >
              <p
                className={`font-medium ${
                  result.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.message}
              </p>
              {result.sandboxUrl && (
                <a
                  href={result.sandboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-blue-400 hover:underline font-medium"
                >
                  Open Preview →
                </a>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Featured Section */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-medium mb-8">Featured</h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: "2.5rem" }}
        >
          {featuredProjects.map((project, index) => (
            <div key={index} className="group cursor-pointer">
              <div
                className="mb-4 transition-transform group-hover:scale-105 w-full"
                style={{
                  aspectRatio: "440 / 314",
                  flexShrink: 0,
                  borderRadius: "0.9375rem",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: `${project.gradient}, lightgray 50% / cover no-repeat`,
                }}
              />
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full"
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    flexShrink: 0,
                    background: project.dotColor,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: "11rem",
                    height: "3.125rem",
                    flexDirection: "column",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#FFF",
                    fontFamily: "Geist",
                    fontSize: "1.125rem",
                    fontStyle: "normal",
                    fontWeight: 600,
                    lineHeight: "normal",
                  }}
                >
                  {project.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-16 text-gray-400">
        <p className="text-lg">
          👉 Try the demo. Build your first app in minutes.
        </p>
      </footer>
    </div>
  );
}
