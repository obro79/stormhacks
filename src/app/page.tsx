"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, ArrowUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [result] = useState<{
    success: boolean;
    message?: string;
    sandboxUrl?: string;
  } | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    console.log("🚀 Submit button clicked!");
    console.log("📝 Prompt:", prompt);

    // Generate a unique session ID for this build
    const sessionId = `build-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    console.log("🆔 Session ID:", sessionId);

    // Immediately redirect to builder page
    const params = new URLSearchParams({
      prompt: prompt,
      sessionId: sessionId,
      status: "building",
    });
    router.push(`/builder?${params.toString()}`);

    // Start the build process in the background
    fetch("/api/build-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, sessionId }),
    }).catch((error) => {
      console.error("❌ Error starting build:", error);
    });
  };

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model_id", "scribe_v1");

      const response = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          method: "POST",
          headers: {
            "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      const transcript = result.text || "";

      // Add the transcript to the existing prompt
      setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
    } catch (error) {
      console.error("Error transcribing audio:", error);
      alert("Failed to transcribe audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const featuredProjects = [
    {
      name: "Typing Test",
      image: "/typing.png",
      dotColor: "#F59E0B",
      url: "https://echome-make-typing-test-17596583579.vercel.app",
    },
    {
      name: "Pomodoro Timer",
      image: "/pomodoro.png",
      dotColor: "#8B5CF6",
      url: "https://echome-build-pomodoro-timer-1759657.vercel.app",
    },
    {
      name: "Battleship",
      image: "/battleship.png",
      dotColor: "#3B82F6",
      url: "https://echome-build-battle-ship-1759657318.vercel.app",
    },
    {
      name: "Finance Tracker",
      image: "/finance-app.png",
      dotColor: "#EF4444",
      url: "https://echome-personal-finance-tracker-175.vercel.app",
    },
    {
      name: "Hello World",
      gradient: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
      dotColor: "#A78BFA",
      url: "https://echome-build-hello-world-1759656585.vercel.app",
    },
    {
      name: "Tic Tac Toe",
      image: "/tictactoe.png",
      dotColor: "#93C5FD",
      url: "https://echome-build-game-1759657580564.vercel.app",
    },
  ];

  return (
    <div className="min-h-screen text-white bg-[#222]">
      {/* Header */}
      <header className="p-2 flex items-center justify-between">
        <div className="flex items-center justify-center">
          <h1 className="ml-2 text-xl font-semibold tracking-tight">EchoMe</h1>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="px-3 py-2 text-white text-[14px]">
                {user.email}
              </span>
              <Button
                onClick={signOut}
                className="px-6 py-2 inline-flex items-center justify-center bg-[#282924] border border-[rgba(255,255,255,0.1)] text-white text-[14px] rounded font-medium tracking-tight hover:opacity-75"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-6 py-2 inline-flex items-center justify-center bg-[#282924] border border-[rgba(255,255,255,0.1)] text-white text-[14px] rounded font-medium tracking-tight hover:opacity-75"
              >
                Login
              </Link>

              <Link
                href="/sign-up"
                className="px-3 py-2 inline-flex items-center justify-center bg-white text-black text-[14px] rounded font-medium tracking-tight hover:opacity-75"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>
      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center h-[75vh] max-w-4xl mx-auto px-8 text-center">
        {/* make this container RELATIVE so the absolute mic will center inside it */}
        <div className="relative text-center space-y-6">
          {/* centered absolute element behind the heading */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transform w-[250px] h-[250px] pointer-events-none opacity-10 "
            aria-hidden="true"
          >
            <Link href="/">
              <Image
                src="/microphone.webp"
                alt="EchoMe Logo"
                height={250}
                width={250}
                className="block"
              />
            </Link>
          </div>

          <h2 className="pb-10 relative z-10 text-6xl font-semibold tracking-tight leading-none">
            Build applications by talking
          </h2>

          {/* <div className="mx-auto text-white text-2xl text-align font-medium tracking-tight leading-none">
            <p>Describe what you want</p>
            <p>Watch it come to life</p>
            <p>No typing required</p>
          </div> */}

          {/* Input Area */}
          <div className="flex justify-center">
            <div
              className="relative p-4 rounded"
              style={{
                width: "38.75rem",
                height: "8.8125rem",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#282924",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app. For example: A task tracker with dark mode and Google login."
                className="w-full h-full bg-transparent border-0 outline-none text-white font-medium placeholder:text-[#F8F8F8] text-sm resize-none"
                style={{ outline: "none", boxShadow: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <Button
                  onClick={handleMicClick}
                  disabled={_loading || isProcessing}
                  variant={isRecording ? "destructive" : "ghost"}
                  size="sm"
                  className={`hover:opacity-80 rounded-full transition-colors flex items-center justify-center text-white ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "hover:bg-white"
                  }`}
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    flexShrink: 0,
                    background: "#3C3C3C",
                  }}
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || _loading}
                  size="icon"
                  className="rounded-full hover:opacity-80 flex items-center justify-center text-white"
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    flexShrink: 0,
                    background: "#3C3C3C",
                  }}
                >
                  <ArrowUp
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

      {/* Featured Section - Only show when not logged in */}
      {!user && (
        <section className="m-2 p-4 bg-[#282924] border border-[rgba(255,255,255,0.15)] rounded">
          <h2 className="text-xl font-medium mb-8 tracking-tight">
            Featured Projects
          </h2>

          {/* Featured Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project, index) => (
              <a
                key={index}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer block"
              >
                <div
                  className="mb-4 transition-transform group-hover:scale-105 w-full relative overflow-hidden"
                  style={{
                    aspectRatio: "440 / 314",
                    flexShrink: 0,
                    borderRadius: "0.9375rem",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: project.gradient || "#282924",
                  }}
                >
                  {project.image && (
                    <Image
                      src={project.image}
                      alt={project.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 ml-0.5 rounded-full shrink-0"
                    style={{
                      background: project.dotColor,
                    }}
                  />
                  <div className="font-medium text-white tracking-tight leading-0">
                    {project.name}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* More */}
          <h2 className="mb-8 mt-24 text-sm text-center text-neutral-400 font-semibold tracking-tight">
            More coming soon...
          </h2>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center py-16 text-gray-400">
        <p className="text-lg">
          👉 Try the demo. Build your first app in minutes.
        </p>
      </footer>
    </div>
  );
}
