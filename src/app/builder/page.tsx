"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

import { Mic, ArrowUp, ExternalLink, Download } from "lucide-react";

import Link from "next/link";
import Image from "next/image";

export default function BuilderPage() {
  // Using dynamic route to avoid SSG issues with searchParams
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"preview" | "code">(
    "preview"
  );
  const [chatInput, setChatInput] = useState("");
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{ type: string; content: string }>
  >([]);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [projectPrompt, setProjectPrompt] = useState<string>("");
  const [codeFiles, setCodeFiles] = useState<Array<{ path: string; content: string; operation: string }>>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Protected route - redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  useEffect(() => {
    // Read URL params
    const prompt = searchParams.get("prompt");
    const url = searchParams.get("sandboxUrl");
    const message = searchParams.get("message");
    const sessionIdParam = searchParams.get("sessionId");
    const status = searchParams.get("status");

    // Store sessionId in state
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }

    const newMessages: Array<{ type: string; content: string }> = [];

    if (prompt) {
      newMessages.push({
        type: "user",
        content: prompt,
      });
      // Store prompt for deployment
      setProjectPrompt(prompt);
    }

    // If building, start listening to SSE
    if (status === "building" && sessionIdParam) {
      console.log("🔄 Starting to listen for build updates...");

      const eventSource = new EventSource(
        `/api/build-stream?sessionId=${sessionIdParam}`
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
        if (data.message.startsWith("COMPLETE:")) {
          const url = data.message.replace("COMPLETE:", "");

          // Fetch with skip-warning header first to bypass Daytona warning page
          fetch(url, {
            method: "HEAD",
            headers: {
              "X-Daytona-Skip-Preview-Warning": "true",
            },
          })
            .catch(() => {
              // Ignore errors, just trying to set the cookie/bypass warning
            })
            .finally(() => {
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
        method: "HEAD",
        headers: {
          "X-Daytona-Skip-Preview-Warning": "true",
        },
      })
        .catch(() => {
          // Ignore errors, just trying to set the cookie/bypass warning
        })
        .finally(() => {
          setSandboxUrl(url);
          setIframeLoading(true);
          console.log("🔗 Loading preview:", url);
        });
    }

    // Default demo if no params
    if (!prompt && !url && !sessionIdParam) {
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

  // Load files when Code tab opens
  useEffect(() => {
    const loadFiles = async () => {
      if (activeTab !== "code" || !sessionId) return;
      setIsCodeLoading(true);
      setCodeError(null);
      try {
        const res = await fetch(`/api/files?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error("Failed to load files");
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.files)) {
          setCodeFiles(data.files);
          if (data.files.length > 0) {
            setSelectedFilePath(data.files[0].path);
          } else {
            setSelectedFilePath(null);
          }
        } else {
          throw new Error(data.message || "Failed to load files");
        }
      } catch (e) {
        setCodeError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsCodeLoading(false);
      }
    };
    loadFiles();
  }, [activeTab, sessionId]);

  const handleDownload = async () => {
    if (!sessionId) {
      console.error("No session ID available for download");
      return;
    }

    try {
      const response = await fetch(`/api/download?sessionId=${sessionId}`);

      if (!response.ok) {
        throw new Error("Failed to download files");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dayton-sandbox-code-${sessionId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading files:", error);
    }
  };
  const handleDeploy = async () => {
    if (isDeploying) return;

    // Check if we have a session/sandbox to deploy
    if (!sessionId) {
      setDeployMessage("❌ No app to deploy. Build an app first!");
      setTimeout(() => setDeployMessage(null), 5000);
      return;
    }

    setIsDeploying(true);
    setDeployMessage("🚀 Creating GitHub repo...");
    setGithubUrl(null);

    try {
      console.log("🚀 Starting GitHub + Vercel deployment...", { sessionId, projectPrompt });

      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          deployType: "github-vercel", // NEW: GitHub + Vercel deployment
          projectPrompt: projectPrompt,
          commitMessage: `Deploy: ${projectPrompt || "Generated project"}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Deployment successful!", data);

        // Store GitHub URL
        if (data.githubUrl) {
          setGithubUrl(data.githubUrl);
        }

        // Show success message
        const message = data.deploymentUrl
          ? `🎉 Deployed! Opening in new tab...`
          : "🎉 GitHub repo created! Vercel deployment in progress...";
        setDeployMessage(message);

        // AUTO-OPEN deployment URL in new tab
        if (data.deploymentUrl) {
          setTimeout(() => {
            window.open(data.deploymentUrl, '_blank');
          }, 1000); // Small delay for better UX
        }

        // Clear success message after 10 seconds
        setTimeout(() => setDeployMessage(null), 10000);
      } else {
        console.error("❌ Deployment failed:", data.error);

        // Store GitHub URL even if Vercel failed
        if (data.githubUrl) {
          setGithubUrl(data.githubUrl);
          setDeployMessage(`⚠️ GitHub repo created, but Vercel deployment failed: ${data.error}`);
        } else {
          setDeployMessage(`❌ ${data.error || "Deployment failed"}`);
        }
      }
    } catch (error) {
      console.error("❌ Deployment error:", error);
      setDeployMessage("❌ Deployment failed. Check console for details.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isThinking) return;

    const userMessage = chatInput;
    console.log("💬 Sending message:", userMessage);

    // Add user message to chat immediately
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: userMessage,
      },
    ]);
    setChatInput("");
    setIsThinking(true);

    try {
      // Call chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          sandboxId: sandboxUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add Claude's response to chat
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: data.response,
          },
        ]);
      } else {
        // Show error in chat
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `Error: ${data.error || "Failed to get response"}`,
          },
        ]);
      }
    } catch (error) {
      console.error("❌ Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#222]">
      {/* Top Header */}
      <header className="flex items-center py-2">
        {/* Logo */}
        <div className="ml-2 w-[400px] flex items-center">
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
        </div>

        {/* Spacer to push Deploy button to the right */}
        <div className="flex-1" />

        {/* Deploy button */}
        <div className="mr-2 flex items-center gap-2">
          {/* Preview Header with Open in New Tab and Download buttons */}
          {sandboxUrl && (
            <>
              {sessionId && (
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2 hover:opacity-90 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Code
                </Button>
              )}
              <Button
                onClick={() => window.open(sandboxUrl, "_blank")}
                variant="outline"
                className="flex items-center gap-2 hover:opacity-90 text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </>
          )}

          {/* GitHub repo link */}
          {githubUrl && (
            <Button
              onClick={() => window.open(githubUrl, "_blank")}
              variant="outline"
              className="flex items-center gap-2 hover:opacity-90 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </Button>
          )}

          {deployMessage && (
            <div
              className={`text-sm font-medium px-3 py-1 rounded ${
                deployMessage.includes("🎉") || deployMessage.includes("✅")
                  ? "text-green-400"
                  : deployMessage.includes("⚠️")
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {deployMessage}
            </div>
          )}
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="text-white hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#22C55E",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {isDeploying ? "Deploying..." : "Deploy"}
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
                      <div className="mb-2 font-semibold text-neutral-500">
                        User
                      </div>

                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="inline-block p-3 rounded-2xl bg-[#3A3A3A] text-white text-left font-regular text-sm  break-words whitespace-pre-line">
                    <div className="mb-2 font-semibold text-neutral-500">
                      Echo Me
                    </div>

                    {message.content}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="text-[#F8F8F8] font-[Geist] font-medium text-sm italic opacity-70">
                Thinking...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className=" relative h-[150px] p-4  bg-[#282924] border border-[rgba(255,255,255,0.15)] rounded">
            <div className="h-full rounded flex items-center gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Talk with EchoMe..."
                className="flex-1 w-full h-full border-0 outline-none text-white placeholder:text-neutral-500 placeholder:font-medium font-semibold text-sm resize-none"
                disabled={isThinking}
              />

              {/* Absolute Buttons */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button className="hover:opacity-80 rounded-full flex items-center justify-center w-[1.875rem] h-[1.875rem] bg-[#3C3C3C]">
                  <Mic className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isThinking}
                  className={`hover:opacity-80 rounded-full flex items-center justify-center w-[1.875rem] h-[1.875rem] bg-[#3C3C3C] ${
                    !chatInput.trim() || isThinking
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <ArrowUp className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col mx-2">
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
              <div className="relative w-full h-full">
                {/* Overlay panel over sandbox area */}
                <div className="absolute inset-0 bg-[#1A1A1A]/95 backdrop-blur-sm border border-[rgba(255,255,255,0.15)]">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.1)]">
                    <div className="text-white font-semibold text-sm">Project Files</div>
                    <button
                      onClick={() => setActiveTab("preview")}
                      className="text-gray-300 hover:text-white text-sm px-2 py-1 rounded border border-[rgba(255,255,255,0.15)]"
                    >
                      Close
                    </button>
                  </div>
                  {/* Body */}
                  <div className="flex h-[calc(100%-2.5rem)]">{/* subtract header height */}
                    {/* File list */}
                    <div className="w-64 border-r border-[rgba(255,255,255,0.1)] overflow-auto">
                      {isCodeLoading && (
                        <div className="p-3 text-gray-400 text-sm">Loading files…</div>
                      )}
                      {codeError && (
                        <div className="p-3 text-red-400 text-sm">{codeError}</div>
                      )}
                      {!isCodeLoading && !codeError && codeFiles.length === 0 && (
                        <div className="p-3 text-gray-400 text-sm">No files to display</div>
                      )}
                      <ul className="text-sm">
                        {codeFiles.map((f) => (
                          <li key={f.path}>
                            <button
                              onClick={() => setSelectedFilePath(f.path)}
                              className={`w-full text-left px-3 py-2 truncate hover:bg-[#2F2F2F] ${
                                selectedFilePath === f.path
                                  ? "bg-[#2A2A2A] text-white"
                                  : "text-gray-300"
                              }`}
                              title={f.path}
                            >
                              {f.path}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Code viewer */}
                    <div className="flex-1 overflow-auto">
                      {selectedFilePath ? (
                        <pre className="p-4 text-[13px] leading-5 text-gray-200 whitespace-pre overflow-auto">
                          {codeFiles.find((f) => f.path === selectedFilePath)?.content || ""}
                        </pre>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                          Select a file to view its code
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
