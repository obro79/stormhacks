import { NextRequest } from 'next/server';
import { buildApp } from '@/lib/orchestrator';
import { storeFiles } from '@/lib/filesStore';

// Store for progress updates
const progressStore = new Map<string, string[]>();

export async function POST(request: NextRequest) {
  let prompt: string, sessionId: string;
  try {
    const body = await request.json();
    prompt = body.prompt;
    sessionId = body.sessionId;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!prompt || !sessionId) {
    return new Response('Missing prompt or sessionId', { status: 400 });
  }

  if (!sessionId || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return new Response('Invalid sessionId format', { status: 400 });
  }

  // Initialize progress array for this session
  progressStore.set(sessionId, []);

  const addProgress = (message: string) => {
    const messages = progressStore.get(sessionId) || [];
    messages.push(message);
    progressStore.set(sessionId, messages);
  };

  // Start build process
  (async () => {
    try {
      addProgress('Calling Claude to generate code...');
      const result = await buildApp(prompt, addProgress);

      // Store files IMMEDIATELY after generation (before checking success)
      if (result.files && result.files.length > 0) {
        storeFiles(sessionId, result.files);
      }

      if (result.success && result.sandboxUrl) {
        addProgress(`Preview ready! ${result.sandboxUrl}`);
        addProgress(`COMPLETE:${result.sandboxUrl}`);
      } else {
        addProgress(`${result.message}`);
        addProgress(`ERROR:${result.message}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addProgress(`Error: ${errorMsg}`);
      addProgress(`ERROR:${errorMsg}`);
    }
  })();

  return new Response('Build started', { status: 200 });
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {

      let lastIndex = 0;
      const startTime = Date.now();
      const MAX_SESSION_TIME = 5 * 60 * 1000; // 5 minutes

      // Poll for new progress updates
      const interval = setInterval(() => {
        // Check session timeout
        if (Date.now() - startTime > MAX_SESSION_TIME) {
          progressStore.delete(sessionId);
          controller.close();
          clearInterval(interval);
          return;
        }

        const messages = progressStore.get(sessionId) || [];

        // Send only new messages
        if (messages.length > lastIndex) {
          for (let i = lastIndex; i < messages.length; i++) {
            const message = messages[i];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));

            // Check if complete or error
            if (message.startsWith('COMPLETE:') || message.startsWith('ERROR:')) {
              clearInterval(interval);
              controller.close();
              // Clean up after a delay
              setTimeout(() => progressStore.delete(sessionId), 5000);
              return;
            }
          }
          lastIndex = messages.length;
        }
      }, 500); // Check every 500ms

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        progressStore.delete(sessionId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
