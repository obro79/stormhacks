"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, Plus, MessageSquare, Upload, ExternalLink } from "lucide-react";

export default function BuilderPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "share">("preview");
  const [chatInput, setChatInput] = useState("");
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ type: string; content: string }>>([]);
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
        content: prompt
      });
    }

    // If building, start listening to SSE
    if (status === "building" && sessionId) {
      console.log("🔄 Starting to listen for build updates...");

      const eventSource = new EventSource(`/api/build-stream?sessionId=${sessionId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📨 SSE message:", data.message);

        // Add progress message
        setMessages(prev => [...prev, {
          type: "assistant",
          content: data.message
        }]);

        // Check if complete
        if (data.message.startsWith('COMPLETE:')) {
          const url = data.message.replace('COMPLETE:', '');
          setSandboxUrl(url);
          setIframeLoading(true);
          eventSource.close();
        } else if (data.message.startsWith('ERROR:')) {
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
          content: message
        });
      }
      setMessages(newMessages);
      setSandboxUrl(url);
      setIframeLoading(true);
      console.log("🔗 Loading preview:", url);
    }

    // Default demo if no params
    if (!prompt && !url && !sessionId) {
      setMessages([
        {
          type: "user",
          content: "Create a task tracker with a list, add/delete, and a dark theme."
        },
        {
          type: "assistant",
          content: "Created a new GitHub repo.\nNew project scaffolded with Next.js + TypeScript + TailwindCSS + shadcn UI.\n\n• Added a Task Tracker page with a task list.\n• Implemented add and delete functionality for tasks.\n• Applied a dark theme across the app.\n\nPreview is ready."
        }
      ]);
    }
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#222222' }}>
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded" />
          <span className="text-white text-lg font-medium">EchoMe</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "preview"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            style={{ fontFamily: 'Geist', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "code"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            style={{ fontFamily: 'Geist', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("share")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "share"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            style={{ fontFamily: 'Geist', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Share
          </button>
        </div>

        <Button
          className="text-black hover:opacity-90"
          style={{
            background: '#22C55E',
            fontFamily: 'Geist',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          Deploy
        </Button>
      </header>

      {/* Main Content - Split Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat History */}
        <div className="w-[400px] flex flex-col border-r border-gray-800">
          {/* Chat History Header */}
          <div className="p-4 border-b border-gray-800">
            <h2
              className="text-white"
              style={{
                fontFamily: 'Geist',
                fontSize: '1.125rem',
                fontWeight: 600
              }}
            >
              Chat History
            </h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === "user" ? (
                  <div
                    className="p-3 rounded-lg ml-auto max-w-[85%]"
                    style={{
                      background: '#3C3C3C',
                      color: '#FFF',
                      fontFamily: 'Geist',
                      fontSize: '0.875rem'
                    }}
                  >
                    {message.content}
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: '#2A2A2A',
                      color: '#E5E5E5',
                      fontFamily: 'Geist',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'Geist' }}>
              Talk with Echome.
            </div>
            <div
              className="relative p-3 rounded-xl flex items-center gap-2"
              style={{
                background: '#282924',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <button
                className="hover:opacity-80 rounded-full flex items-center justify-center"
                style={{
                  width: '1.875rem',
                  height: '1.875rem',
                  background: '#3C3C3C'
                }}
              >
                <Plus
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#FFFFFF',
                    strokeWidth: 1.5
                  }}
                />
              </button>

              <button
                className="hover:opacity-80 rounded-full flex items-center justify-center"
                style={{
                  width: '1.875rem',
                  height: '1.875rem',
                  background: '#3C3C3C'
                }}
              >
                <MessageSquare
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#FFFFFF',
                    strokeWidth: 1.5
                  }}
                />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder=""
                className="flex-1 bg-transparent border-0 outline-none text-white text-sm"
                style={{ fontFamily: 'Geist' }}
              />

              <button
                className="hover:opacity-80 rounded-full flex items-center justify-center opacity-50"
                style={{
                  width: '1.875rem',
                  height: '1.875rem',
                  background: '#3C3C3C'
                }}
                disabled
              >
                <Mic
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#FFFFFF',
                    strokeWidth: 1.5
                  }}
                />
              </button>

              <button
                className="hover:opacity-80 rounded-full flex items-center justify-center"
                style={{
                  width: '1.875rem',
                  height: '1.875rem',
                  background: '#3C3C3C'
                }}
              >
                <Mic
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#FFFFFF',
                    strokeWidth: 1.5
                  }}
                />
              </button>

              <button
                className="hover:opacity-80 rounded-full flex items-center justify-center"
                style={{
                  width: '1.875rem',
                  height: '1.875rem',
                  background: '#3C3C3C'
                }}
              >
                <Upload
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#FFFFFF',
                    strokeWidth: 1.5
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col p-6">
          {/* Preview Header with Open in New Tab button */}
          {sandboxUrl && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => window.open(sandboxUrl, '_blank')}
                variant="outline"
                className="flex items-center gap-2"
                style={{
                  fontFamily: 'Geist',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          )}

          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              border: '2px solid #6366F1',
              background: '#1A1A1A'
            }}
          >
            {activeTab === "preview" && (
              <div className="w-full h-full relative">
                {sandboxUrl ? (
                  <>
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                        <div className="text-gray-400" style={{ fontFamily: 'Geist' }}>
                          Loading preview...
                        </div>
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
                    <div className="text-gray-400" style={{ fontFamily: 'Geist' }}>
                      No preview available
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "code" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400" style={{ fontFamily: 'Geist' }}>
                  Code view will load here
                </div>
              </div>
            )}
            {activeTab === "share" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400" style={{ fontFamily: 'Geist' }}>
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
