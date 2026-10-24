import { FileChange } from './types';

/**
 * Parse Claude's response into files. The system prompt asks for:
 *
 *   <files>
 *   FILE: path/to/file.ext
 *   ```
 *   contents
 *   ```
 *   </files>
 *
 * Blocks without a path or a fenced body are skipped.
 */
export function parseFilesFromResponse(text: string): FileChange[] {
  const files: FileChange[] = [];

  const filesMatch = text.match(/<files>([\s\S]*?)<\/files>/);
  if (!filesMatch) {
    return files;
  }

  const fileBlocks = filesMatch[1].split(/FILE:\s+/).filter(block => block.trim());

  for (const block of fileBlocks) {
    const path = block.trim().split('\n')[0].trim();
    const contentMatch = block.match(/```[\w-]*\n([\s\S]*?)```/);

    if (contentMatch && path) {
      files.push({
        path,
        content: contentMatch[1].trim(),
        operation: 'create',
      });
    }
  }

  return files;
}
