import { NextRequest, NextResponse } from 'next/server';
import { callClaude, extractTextFromResponse } from '@/lib/api';
import { ClaudeMessage } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { message, sandboxId } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('💬 Chat message received:', message);
    console.log('📦 Sandbox ID:', sandboxId || 'none');

    // Create system prompt
    const systemPrompt = sandboxId
      ? `You are a helpful AI assistant helping users build web applications.
The user is currently working on a project in a live sandbox environment (ID: ${sandboxId}).
Provide clear, concise, and helpful responses. If they ask questions about their project, provide guidance.
If they request changes, explain what needs to be done (note: actual code changes will be implemented in a future update).`
      : `You are a helpful AI assistant helping users build web applications.
Provide clear, concise, and helpful responses.`;

    // Call Claude API
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: message,
      },
    ];

    console.log('🧠 Calling Claude API for chat response...');
    const response = await callClaude(messages, systemPrompt, {
      maxTokens: 2000,
      temperature: 1,
    });

    const text = extractTextFromResponse(response);
    console.log('✅ Claude chat response received');

    return NextResponse.json({
      success: true,
      response: text,
    });
  } catch (error) {
    console.error('❌ Error in chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
