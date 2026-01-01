import { Daytona } from '@daytonaio/sdk';
import { FileChange } from './types';

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

// Type definitions
interface DaytonaConfig {
  apiKey: string;
  apiUrl?: string;
  target?: string;
}

// Type guard for safe type narrowing
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// Sanitize file paths to prevent directory traversal attacks
function sanitizePath(filePath: string): string {
  const normalized = filePath.replace(/^\/+/, '').replace(/\.\.\//g, '');
  if (normalized.startsWith('..') || normalized.includes('/../')) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  return normalized;
}

async function waitForServer(url: string, onProgress?: (message: string) => void, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok || response.status === 404) {
        // 404 is ok - means server is running, just no route
        return true;
      }
    } catch {
      // Expected to fail while server is starting
      if (i % 5 === 0 && i > 0) {
        // Update progress every 10 seconds (5 attempts * 2 seconds)
        onProgress?.(`Still waiting for server... (${i * 2}s)`);
      }
    }

    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.error('Server failed to start within timeout period');
  return false;
}

export async function createDaytonaSandbox(files: FileChange[], onProgress?: (message: string) => void): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  // Build config object - only include defined values
  const daytonaConfig: DaytonaConfig = {
    apiKey: DAYTONA_API_KEY,
  };

  if (process.env.DAYTONA_API_URL) {
    daytonaConfig.apiUrl = process.env.DAYTONA_API_URL;
  }

  if (process.env.DAYTONA_TARGET) {
    daytonaConfig.target = process.env.DAYTONA_TARGET;
  }

  const daytona = new Daytona(daytonaConfig);

  // Create a new sandbox
  let sandbox;
  try {
    onProgress?.('Creating sandbox...');
    sandbox = await daytona.create({
      public: true,
      image: 'node:20'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create Daytona sandbox:', message);

    // Provide helpful error message
    if (message.includes('runner info')) {
      throw new Error(`Daytona runner not found. This usually means:
1. Invalid DAYTONA_TARGET - check configuration
2. No runner available in the specified target region
3. API URL incorrect - check configuration

Original error: ${message}`);
    }

    throw error;
  }

  try {
    // Get user root directory
    const rootDir = await sandbox.getUserRootDir();
    onProgress?.('Setting up project directory...');

    onProgress?.('Uploading files to sandbox...');

    // Write all files to the sandbox using uploadFiles with full paths
    await sandbox.fs.uploadFiles(
      files.map(file => ({
        source: Buffer.from(file.content),
        destination: `${rootDir}/${sanitizePath(file.path)}`
      }))
    );
    onProgress?.('Files uploaded');

    // Install dependencies
    onProgress?.('Installing dependencies...');

    const installResult = await sandbox.process.executeCommand(
      'npm install',
      rootDir,
      undefined,
      300000 // 5 minute timeout
    );

    if (installResult.exitCode !== 0) {
      console.error('npm install failed:', installResult.result);
      throw new Error(`npm install failed: ${installResult.result}`);
    }

    onProgress?.('Dependencies installed');

    // Start Next.js dev server on port 3000 using nohup (background process with logging)
    onProgress?.('Starting Next.js dev server...');

    await sandbox.process.executeCommand(
      'nohup npm run dev > dev-server.log 2>&1 &',
      rootDir,
      { PORT: '3000' }
    );

    // Wait for server to initialize
    onProgress?.('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if server is running on localhost
    const healthCheck = await sandbox.process.executeCommand(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
      rootDir
    );

    if (healthCheck.result?.trim() === '200') {
      onProgress?.('Server started successfully!');
    } else {
      onProgress?.('Checking server logs...');

      // Read server logs for debugging
      const logsResult = await sandbox.process.executeCommand('cat dev-server.log', rootDir);
      const logs = logsResult.result || '';

      // Check for SUCCESSFUL startup patterns FIRST
      const serverReady = logs.includes('Ready in') ||
                          logs.includes('started server on') ||
                          logs.includes('Compiling');

      if (serverReady) {
        onProgress?.('Server is running!');
        // Server is up - ignore non-critical errors like fonts/favicon
      } else {
        // Server didn't report ready - check if there are CRITICAL errors
        const hasCriticalError =
          logs.includes('EADDRINUSE') ||
          logs.includes('MODULE_NOT_FOUND') ||
          logs.includes('Cannot find module') ||
          logs.includes('Failed to compile') ||
          logs.includes('Error: listen');

        if (hasCriticalError) {
          // Extract the critical error
          const errorLines = logs.split('\n').filter(line =>
            line.includes('EADDRINUSE') ||
            line.includes('MODULE_NOT_FOUND') ||
            line.includes('Cannot find module') ||
            line.includes('Failed to compile') ||
            line.includes('Error: listen')
          );
          const errorMsg = errorLines[0] || 'Unknown critical error';
          console.error('Critical server error:', errorMsg);
          onProgress?.(`Critical error: ${errorMsg.substring(0, 100)}`);
          throw new Error(`Server failed to start: ${errorMsg}`);
        }

        // No "Ready" message but no critical errors either - continue anyway
        onProgress?.('Server status unclear, trying preview...');
      }
    }

    // Get preview URL and wait for server to be ready
    const previewLink = await sandbox.getPreviewLink(3000);
    const serverReady = await waitForServer(previewLink.url, onProgress);

    if (!serverReady) {
      onProgress?.('Server taking longer than expected...');
    }

    return sandbox.id;
  } catch (error) {
    // Clean up sandbox on failure
    if (sandbox) {
      try {
        await sandbox.delete();
        console.log('Cleaned up sandbox after failure');
      } catch (cleanupError) {
        console.error('Failed to clean up sandbox:', cleanupError);
      }
    }
    throw error;
  }
}

export async function getSandboxUrl(sandboxId: string): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  // Get sandbox
  const sandbox = await daytona.get(sandboxId);

  // Get preview link for port 3000 where the Next.js dev server is running
  const previewLink = await sandbox.getPreviewLink(3000);

  return previewLink.url;
}

export async function deleteDaytonaSandbox(sandboxId: string): Promise<void> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  const sandbox = await daytona.get(sandboxId);
  await sandbox.delete();
}

export async function listAllSandboxes(): Promise<string[]> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  const response = await daytona.list();

  // Handle different response formats
  const sandboxes = Array.isArray(response)
    ? response
    : (isRecord(response) && Array.isArray(response.sandboxes) ? response.sandboxes : []);
  return sandboxes.map((s: unknown) => {
    if (isRecord(s) && typeof s.id === 'string') {
      return s.id;
    }
    return '';
  }).filter(id => id !== '');
}

export async function deleteAllSandboxes(): Promise<{ deleted: number; ids: string[] }> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const response = await daytona.list();

  // Handle different response formats
  const sandboxes = Array.isArray(response)
    ? response
    : (isRecord(response) && Array.isArray(response.sandboxes) ? response.sandboxes : []);

  const deletedIds: string[] = [];

  for (const sandbox of sandboxes) {
    try {
      if (isRecord(sandbox) && typeof sandbox.id === 'string') {
        if (typeof (sandbox as { delete?: () => Promise<void> }).delete === 'function') {
          await (sandbox as { delete: () => Promise<void> }).delete();
        }
        deletedIds.push(sandbox.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to delete sandbox:', message);
    }
  }

  return {
    deleted: deletedIds.length,
    ids: deletedIds
  };
}
