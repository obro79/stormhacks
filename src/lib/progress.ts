// Build progress is streamed to the builder page over SSE. The last message
// of a build is either `COMPLETE:<previewUrl>` or `ERROR:<message>`.
export const COMPLETE_PREFIX = 'COMPLETE:';
export const ERROR_PREFIX = 'ERROR:';

export function isTerminalMessage(message: string): boolean {
  return message.startsWith(COMPLETE_PREFIX) || message.startsWith(ERROR_PREFIX);
}

export function formatSseEvent(message: string): string {
  return `data: ${JSON.stringify({ message })}\n\n`;
}
