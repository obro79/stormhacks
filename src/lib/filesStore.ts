import { FileChange } from './types';

// Store for generated files by session ID - shared across API routes
export const filesStore = new Map<string, FileChange[]>();

// Export storeFiles function for external use
export function storeFiles(sessionId: string, files: FileChange[]) {
  filesStore.set(sessionId, files);
}
