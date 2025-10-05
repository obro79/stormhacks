import { FileChange } from './types';

// Type for global filesStore
declare global {
  var filesStore: Map<string, FileChange[]> | undefined;
}

// Use globalThis to ensure singleton across all Next.js API routes
// In Next.js dev mode, each API route is a separate module instance
// Using globalThis ensures they all share the same Map
export const filesStore = globalThis.filesStore ?? new Map<string, FileChange[]>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.filesStore = filesStore;
}

// Export storeFiles function for external use
export function storeFiles(sessionId: string, files: FileChange[]) {
  console.log(`[filesStore] Storing ${files.length} files for session: ${sessionId}`);
  filesStore.set(sessionId, files);
  console.log(`[filesStore] Total sessions stored: ${filesStore.size}`, Array.from(filesStore.keys()));
}
