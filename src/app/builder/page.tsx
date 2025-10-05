"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Mic, Plus, MessageSquare, ArrowUp, ExternalLink } from "lucide-react";

import Link from "next/link";
import Image from "next/image";

export default function BuilderPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "share">(
    "preview"
  );
  const [chatInput, setChatInput] = useState("");
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{ type: string; content: string }>
  >([]);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    // Read URL params
    const prompt = searchParams.get("prompt");
    const url = searchParams.get("sandboxUrl");
    const message = searchParams.get("message");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status");

    const newMessages: Array<{ type: string; content: string }> = [];

    if (prompt) {
      newMessages.push({
        type: "user",
        content: prompt,
      });
    }

    // If building, start listening to SSE
    if (status === "building" && sessionId) {
      console.log("🔄 Starting to listen for build updates...");

      const eventSource = new EventSource(
        `/api/build-stream?sessionId=${sessionId}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📨 SSE message:", data.message);

        // Add progress message
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: data.message,
          },
        ]);

        // Check if complete
        if (data.message.startsWith('COMPLETE:')) {
          const url = data.message.replace('COMPLETE:', '');

          // Fetch with skip-warning header first to bypass Daytona warning page
          fetch(url, {
            method: 'HEAD',
            headers: {
              'X-Daytona-Skip-Preview-Warning': 'true'
            }
          }).catch(() => {
            // Ignore errors, just trying to set the cookie/bypass warning
          }).finally(() => {
            setSandboxUrl(url);
            setIframeLoading(true);
          });

          eventSource.close();
        } else if (data.message.startsWith("ERROR:")) {
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        console.error("❌ SSE connection error");
        eventSource.close();
      };

      setMessages(newMessages);

      return () => {
        eventSource.close();
      };
    }

    // If sandboxUrl provided directly (old flow)
    if (url) {
      if (message) {
        newMessages.push({
          type: "assistant",
          content: message,
        });
      }
      setMessages(newMessages);

      // Fetch with skip-warning header first to bypass Daytona warning page
      fetch(url, {
        method: 'HEAD',
        headers: {
          'X-Daytona-Skip-Preview-Warning': 'true'
        }
      }).catch(() => {
        // Ignore errors, just trying to set the cookie/bypass warning
      }).finally(() => {
        setSandboxUrl(url);
        setIframeLoading(true);
        console.log("🔗 Loading preview:", url);
      });
    }

    // Default demo if no params
    if (!prompt && !url && !sessionId) {
      setMessages([
        {
          type: "user",
          content:
            "Create a task tracker with a list, add/delete, and a dark theme.",
        },
        {
          type: "assistant",
          content:
            "Created a new GitHub repo.\nNew project scaffolded with Next.js + TypeScript + TailwindCSS + shadcn UI.\n\n• Added a Task Tracker page with a task list.\n• Implemented add and delete functionality for tasks.\n• Applied a dark theme across the app.\n\nPreview is ready.",
        },
      ]);
    }
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col bg-[#222]">
      {/* Top Header */}
      <header className="flex items-center py-2">
        {/* Logo */}
        <div className="ml-2 w-[400px] flex items-center gap-2">
          <div className="w-10 h-10">
            <Link href="/">
              <Image
                src="/microphone.webp"
                alt="EchoMe Logo"
                height={50}
                width={50}
              />
            </Link>
          </div>
        </div>

        {/* Buttons aligned with preview panel */}
        <div className="ml-2 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === "preview"
                ? "bg-[#282924] border border-[rgba(255,255,255,0.15)] text-white"
                : "text-gray-400 hover:text-white"
            } text-sm font-medium`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === "code"
                ? "bg-[#282924] border border-[rgba(255,255,255,0.15)] text-white"
                : "text-gray-400 hover:text-white"
            } text-sm font-medium`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("share")}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === "share"
                ? "bg-[#282924] border border-[rgba(255,255,255,0.15)] text-white"
                : "text-gray-400 hover:text-white"
            } text-sm font-medium`}
          >
            Share
          </button>
        </div>

        {/* Spacer to push Deploy button to the right */}
        <div className="flex-1" />

        {/* Deploy button */}
        <div className="mr-2">
          <Button
            className="text-white hover:opacity-75"
            style={{
              background: "#22C55E",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Deploy
          </Button>
        </div>
      </header>

      {/* Main Content - Split Panel */}
      <div className="flex-1 flex overflow-hidden ml-2 mb-2">
        {/* Left Panel - Chat History */}
        <div className="w-[400px] flex flex-col ">
          {/* Chat History Header */}
          <div className="p-4 bg-[#282924] border-x border-t border-[rgba(255,255,255,0.15)] rounded-t">
            <h2 className="text-white font-semibold">Chat History</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 mb-2 space-y-6  bg-[#282924] border-x border-b border-[rgba(255,255,255,0.15)] rounded-b">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="inline-block p-3 rounded-2xl bg-[#3A3A3A] text-white text-right font-medium text-sm max-w-[75%] break-words whitespace-pre-line">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="text-[#F8F8F8] font-[Geist] font-medium text-sm whitespace-pre-line">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className=" relative h-[150px] p-4  bg-[#282924] border border-[rgba(255,255,255,0.15)] rounded">
            <div className="h-full rounded flex items-center gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Talk with EchoMe."
                className="flex-1 w-full h-full border-0 outline-none text-white placeholder:text-white font-semibold text-sm resize-none"
              />

              {/* Absolute Buttons */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button className="hover:opacity-80 rounded-full flex items-center justify-center w-[1.875rem] h-[1.875rem] bg-[#3C3C3C]">
                  <Mic className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>

                <button className="hover:opacity-80 rounded-full flex items-center justify-center w-[1.875rem] h-[1.875rem] bg-[#3C3C3C]">
                  <ArrowUp className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col mx-2">
          {/* Preview Header with Open in New Tab button */}
          {sandboxUrl && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => window.open(sandboxUrl, "_blank")}
                variant="outline"
                className="flex items-center gap-2"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          )}

          <div className="flex-1 rounded overflow-hidden bg-[#282924] border border-[rgba(255,255,255,0.15)]">
            {activeTab === "preview" && (
              <div className="w-full h-full relative">
                {sandboxUrl ? (
                  <>
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                        <div className="text-gray-400">Loading preview...</div>
                      </div>
                    )}
                    <iframe
                      src={sandboxUrl}
                      className="w-full h-full"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation allow-popups-to-escape-sandbox allow-top-navigation allow-presentation allow-storage-access-by-user-activation allow-orientation-lock"
                      allow="accelerometer; camera; encrypted-media; geolocation; microphone; display-capture"
                      onClick={() => console.log("🖱️ Iframe area clicked")}
                      onLoad={() => {
                        setIframeLoading(false);
                        console.log("✅ Preview loaded successfully");
                        console.log("🔍 Iframe src:", sandboxUrl);
                      }}
                      onError={() => {
                        setIframeLoading(false);
                        console.error("❌ Failed to load preview");
                      }}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white font-semibold">
                      No preview available
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "code" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white font-semibold">
                  Code view will load here
                </div>
              </div>
            )}
            {activeTab === "share" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white font-semibold">
                  Share options will load here
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
