import { Daytona } from '@daytonaio/sdk';
import { FileChange } from './types';
import { startTimer } from './performance-logger';

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

interface FileInfo {
  path: string;
  isDir: boolean;
  name: string;
}

/**
 * Lists all project files in the sandbox (excluding node_modules, .next, .git)
 */
export async function listProjectFiles(sandboxId: string): Promise<string[]> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);
  const rootDir = await sandbox.getUserRootDir();

  if (!rootDir) {
    throw new Error('Failed to get root directory');
  }

  const filePaths: string[] = [];

  const listRecursive = async (dir: string): Promise<void> => {
    const files = await sandbox.fs.listFiles(dir);

    for (const file of files) {
      const fullPath = `${dir}/${file.name}`;
      const relativePath = fullPath.replace(`${rootDir}/`, '');

      if (file.isDir) {
        // Skip excluded directories
        if (file.name === 'node_modules' || file.name === '.next' || file.name === '.git') {
          continue;
        }
        await listRecursive(fullPath);
      } else {
        // Skip non-source files
        if (file.name?.endsWith('.log') || file.name === 'package-lock.json') {
          continue;
        }
        filePaths.push(relativePath);
      }
    }
  };

  await listRecursive(rootDir);
  return filePaths;
}

/**
 * Reads a single file from the sandbox
 */
export async function readFileFromSandbox(
  sandboxId: string,
  filePath: string
): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);
  const rootDir = await sandbox.getUserRootDir();

  if (!rootDir) {
    throw new Error('Failed to get root directory');
  }

  const fullPath = `${rootDir}/${filePath}`;
  const content = await sandbox.fs.downloadFile(fullPath);
  return content.toString('utf-8');
}

/**
 * Reads multiple files from the sandbox
 */
export async function readMultipleFiles(
  sandboxId: string,
  filePaths: string[]
): Promise<FileChange[]> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);
  const rootDir = await sandbox.getUserRootDir();

  if (!rootDir) {
    throw new Error('Failed to get root directory');
  }

  const files: FileChange[] = [];

  for (const filePath of filePaths) {
    const timer = startTimer();
    try {
      const fullPath = `${rootDir}/${filePath}`;
      const content = await sandbox.fs.downloadFile(fullPath);
      const contentStr = content.toString('utf-8');
      const sizeKB = (contentStr.length / 1024).toFixed(1);

      files.push({
        path: filePath,
        content: contentStr,
        operation: 'create',
      });

      const elapsed = timer.stop();
      console.log(`     → ${filePath} (${sizeKB}KB) - ${elapsed}ms`);
    } catch (error) {
      const elapsed = timer.stop();
      console.warn(`     ⚠️ Failed to read ${filePath} after ${elapsed}ms:`, error);
    }
  }

  return files;
}

/**
 * Writes a single file to the sandbox
 */
export async function writeFileToSandbox(
  sandboxId: string,
  filePath: string,
  content: string,
  onProgress?: (message: string) => void
): Promise<void> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);
  const rootDir = await sandbox.getUserRootDir();

  if (!rootDir) {
    throw new Error('Failed to get root directory');
  }

  const fullPath = `${rootDir}/${filePath}`;
  await sandbox.fs.uploadFile(Buffer.from(content), fullPath);

  onProgress?.(`✅ Updated ${filePath}`);
  console.log(`✅ Wrote file: ${filePath}`);
}

/**
 * Writes multiple files to the sandbox (for bulk updates)
 */
export async function writeMultipleFiles(
  sandboxId: string,
  files: FileChange[],
  onProgress?: (message: string) => void
): Promise<void> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const timer = startTimer();
  onProgress?.(`📤 Updating ${files.length} file(s)...`);

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);
  const rootDir = await sandbox.getUserRootDir();

  if (!rootDir) {
    throw new Error('Failed to get root directory');
  }

  // Log file info before upload
  for (const file of files) {
    const sizeKB = (file.content.length / 1024).toFixed(1);
    console.log(`     → ${file.path} (${sizeKB}KB)`);
  }

  // Upload all files
  await sandbox.fs.uploadFiles(
    files.map(file => ({
      source: Buffer.from(file.content),
      destination: `${rootDir}/${file.path}`
    }))
  );

  const elapsed = timer.stop();
  console.log(`     → Upload completed in ${elapsed}ms`);
  onProgress?.(`✅ Updated ${files.length} file(s)`);
}
