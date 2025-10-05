import { ClaudeResponse, ClaudeMessage } from './types';

const ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<ClaudeResponse> {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 8000,
    temperature = 1,
  } = options;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function extractTextFromResponse(response: ClaudeResponse): string {
  const textBlocks = response.content.filter(block => block.type === 'text');
  return textBlocks.map(block => block.text || '').join('\n');
}

export function extractThinkingFromResponse(response: ClaudeResponse): string {
  const thinkingBlocks = response.content.filter(block => block.type === 'thinking');
  return thinkingBlocks.map(block => block.thinking || '').join('\n');
}
