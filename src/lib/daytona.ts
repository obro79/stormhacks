import { Daytona } from '@daytonaio/sdk';
import { FileChange } from './types';

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

async function waitForServer(url: string, onProgress?: (message: string) => void, maxRetries = 30): Promise<boolean> {
  console.log('⏳ Waiting for server to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok || response.status === 404) {
        // 404 is ok - means server is running, just no route
        console.log(`✅ Server is ready! (attempt ${i + 1}/${maxRetries})`);
        return true;
      }
    } catch (error) {
      // Expected to fail while server is starting
      console.log(`⏳ Server not ready yet (attempt ${i + 1}/${maxRetries})...`);
      if (i % 5 === 0 && i > 0) {
        // Update progress every 10 seconds (5 attempts * 2 seconds)
        onProgress?.(`⏳ Still waiting for server... (${i * 2}s)`);
      }
    }

    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.error('❌ Server failed to start within timeout period');
  return false;
}

export async function createDaytonaSandbox(files: FileChange[], onProgress?: (message: string) => void): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  // Create a new sandbox
  const sandbox = await daytona.create();

  console.log('📁 Uploading files to sandbox...');
  onProgress?.('📁 Uploading files to sandbox...');

  // Write all files to the sandbox using uploadFiles
  await sandbox.fs.uploadFiles(
    files.map(file => ({
      source: Buffer.from(file.content),
      destination: file.path
    }))
  );
  console.log('✅ Files uploaded');
  onProgress?.('✅ Files uploaded');

  // Install dependencies
  console.log('📦 Installing npm dependencies...');
  onProgress?.('📦 Installing dependencies...');

  const installSession = `install-${sandbox.id}`;
  await sandbox.process.createSession(installSession);
  await sandbox.process.executeSessionCommand(installSession, {
    command: 'npm install',
    runAsync: false // Wait for install to complete
  });
  console.log('✅ Dependencies installed');
  onProgress?.('✅ Dependencies installed');

  // Start Next.js dev server on port 3000 using a session (for background process)
  console.log('🚀 Starting Next.js dev server...');
  onProgress?.('🚀 Starting Next.js dev server...');

  const serverSession = `server-${sandbox.id}`;
  await sandbox.process.createSession(serverSession);
  await sandbox.process.executeSessionCommand(serverSession, {
    command: 'npm run dev',
    runAsync: true
  });
  console.log('✅ Server command sent');
  onProgress?.('⏳ Waiting for server to be ready...');

  // Get preview URL and wait for server to be ready
  const previewLink = await sandbox.getPreviewLink(3000);
  const serverReady = await waitForServer(previewLink.url, onProgress);

  if (!serverReady) {
    console.warn('⚠️ Server may not be fully ready, but continuing anyway...');
    onProgress?.('⚠️ Server taking longer than expected...');
  }

  return sandbox.id;
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
  console.log('📋 List response:', response);

  // Handle different response formats
  const sandboxes = Array.isArray(response) ? response : (response as any).sandboxes || [];
  return sandboxes.map((s: any) => s.id);
}

export async function deleteAllSandboxes(): Promise<{ deleted: number; ids: string[] }> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  console.log('🧹 Starting cleanup of all Daytona sandboxes...');

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  const response = await daytona.list();
  console.log('📋 List response:', response);

  // Handle different response formats
  const sandboxes = Array.isArray(response) ? response : (response as any).sandboxes || [];

  console.log(`📊 Found ${sandboxes.length} sandbox(es) to delete`);

  const deletedIds: string[] = [];

  for (const sandbox of sandboxes) {
    try {
      console.log(`🗑️  Deleting sandbox: ${sandbox.id}`);
      await sandbox.delete();
      deletedIds.push(sandbox.id);
      console.log(`✅ Deleted: ${sandbox.id}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${sandbox.id}:`, error);
    }
  }

  console.log(`✅ Cleanup complete! Deleted ${deletedIds.length} sandbox(es)`);

  return {
    deleted: deletedIds.length,
    ids: deletedIds
  };
}
