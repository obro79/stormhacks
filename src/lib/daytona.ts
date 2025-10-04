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

  // Write all files to the sandbox using uploadFiles
  await sandbox.fs.uploadFiles(
    files.map(file => ({
      source: Buffer.from(file.content),
      destination: file.path
    }))
  );

  // Start a simple HTTP server on port 8000 using a session (for background process)
  const sessionId = `http-server-${sandbox.id}`;
  await sandbox.process.createSession(sessionId);
  await sandbox.process.executeSessionCommand(sessionId, {
    command: 'python3 -m http.server 8000',
    runAsync: true
  });

  return sandbox.id;
}

export async function getSandboxUrl(sandboxId: string): Promise<string> {
  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY });

  // Get sandbox
  const sandbox = await daytona.get(sandboxId);

  // Get preview link for port 8000 where the HTTP server is running
  const previewLink = await sandbox.getPreviewLink(8000);

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
