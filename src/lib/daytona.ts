import { Daytona } from '@daytonaio/sdk';
import { FileChange } from './types';

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

export async function createDaytonaSandbox(files: FileChange[]): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  // Create a new sandbox
  const sandbox = await daytona.create();

  console.log('📁 Uploading files to sandbox...');
  // Write all files to the sandbox using uploadFiles
  await sandbox.fs.uploadFiles(
    files.map(file => ({
      source: Buffer.from(file.content),
      destination: file.path
    }))
  );
  console.log('✅ Files uploaded');

  // Install dependencies
  console.log('📦 Installing npm dependencies...');
  const installSession = `install-${sandbox.id}`;
  await sandbox.process.createSession(installSession);
  await sandbox.process.executeSessionCommand(installSession, {
    command: 'npm install',
    runAsync: false // Wait for install to complete
  });
  console.log('✅ Dependencies installed');

  // Start Next.js dev server on port 3000 using a session (for background process)
  console.log('🚀 Starting Next.js dev server...');
  const serverSession = `server-${sandbox.id}`;
  await sandbox.process.createSession(serverSession);
  await sandbox.process.executeSessionCommand(serverSession, {
    command: 'npm run dev',
    runAsync: true
  });
  console.log('✅ Server started');

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
