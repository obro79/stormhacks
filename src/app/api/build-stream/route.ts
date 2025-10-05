import { NextRequest } from 'next/server';
import { buildApp } from '@/lib/orchestrator';
import { storeFiles } from '../download/route';

// Store for progress updates
const progressStore = new Map<string, string[]>();

export async function POST(request: NextRequest) {
  const { prompt, sessionId } = await request.json();

  if (!prompt || !sessionId) {
    return new Response('Missing prompt or sessionId', { status: 400 });
  }

  console.log(`📨 Starting build for session: ${sessionId}`);

  // Initialize progress array for this session
  progressStore.set(sessionId, []);

  const addProgress = (message: string) => {
    const messages = progressStore.get(sessionId) || [];
    messages.push(message);
    progressStore.set(sessionId, messages);
    console.log(`📊 Progress [${sessionId}]: ${message}`);
  };

  // Start build process
  (async () => {
    try {
      addProgress('🧠 Calling Claude to generate code...');
      const result = await buildApp(prompt, addProgress);

      if (result.success && result.sandboxUrl) {
        addProgress(`✅ Preview ready! ${result.sandboxUrl}`);
        addProgress(`COMPLETE:${result.sandboxUrl}`);
        
        // Store files for download
        if (result.files && result.files.length > 0) {
          storeFiles(sessionId, result.files);
        }
      } else {
        addProgress(`❌ ${result.message}`);
        addProgress(`ERROR:${result.message}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addProgress(`❌ Error: ${errorMsg}`);
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
      console.log(`📡 Client connected to stream: ${sessionId}`);

      let lastIndex = 0;

      // Poll for new progress updates
      const interval = setInterval(() => {
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
        console.log(`🔌 Client disconnected: ${sessionId}`);
        clearInterval(interval);
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
