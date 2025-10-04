"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Upload, ArrowRight } from "lucide-react";

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

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to generate app. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const featuredProjects = [
    { name: "Landing Page", color: "bg-gradient-to-br from-gray-600 to-gray-800" },
    { name: "Website", color: "bg-gradient-to-br from-indigo-500 to-purple-600" },
    { name: "Portfolio", color: "bg-gradient-to-br from-orange-500 to-red-600" },
    { name: "Blog", color: "bg-gradient-to-br from-gray-500 to-gray-700" },
    { name: "Ecommerce", color: "bg-gradient-to-br from-blue-500 to-cyan-600" },
    { name: "Photography", color: "bg-gradient-to-br from-orange-600 to-amber-700" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded" />
          <span className="text-xl font-medium">Echome</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:text-white/80">
            Login
          </Button>
          <Button className="bg-white text-black hover:bg-white/90">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center space-y-6">
          <h1
            className="text-7xl font-medium tracking-[-0.2rem]"
            style={{ fontFamily: 'var(--font-geist-sans)' }}
          >
            Build applications by talking.
          </h1>

          <div className="text-xl text-gray-400 space-y-1">
            <p>Describe what you want.</p>
            <p>Watch it come to life.</p>
            <p>No typing required.</p>
          </div>

          {/* Input Area */}
          <div className="pt-8">
            <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app. For example: A task tracker with dark mode and Google login."
                className="flex-1 bg-transparent border-0 focus:outline-none text-white placeholder:text-gray-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <Mic className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || loading}
                  size="icon"
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700"
                >
                  <ArrowRight className="w-5 h-5" />
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
              <p className={`font-medium ${result.success ? "text-green-400" : "text-red-400"}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => (
            <div
              key={index}
              className="group cursor-pointer"
            >
              <div className={`${project.color} aspect-video rounded-xl mb-4 transition-transform group-hover:scale-105`} />
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${project.color}`} />
                <span className="text-sm">{project.name}</span>
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
