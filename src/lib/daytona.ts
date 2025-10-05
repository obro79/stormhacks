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
  // Validate and log configuration
  console.log('📋 Daytona Configuration Check:');
  console.log('  - API Key:', DAYTONA_API_KEY ? `${DAYTONA_API_KEY.substring(0, 10)}...` : '❌ MISSING');
  console.log('  - API URL:', process.env.DAYTONA_API_URL || '⚠️ Not set (will use SDK default: https://app.daytona.io/api)');
  console.log('  - Target:', process.env.DAYTONA_TARGET || '⚠️ Not set (SDK will determine from API)');

  if (!DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }

  // Build config object - only include defined values
  const daytonaConfig: any = {
    apiKey: DAYTONA_API_KEY,
  };

  if (process.env.DAYTONA_API_URL) {
    daytonaConfig.apiUrl = process.env.DAYTONA_API_URL;
  }

  if (process.env.DAYTONA_TARGET) {
    daytonaConfig.target = process.env.DAYTONA_TARGET;
  }

  const daytona = new Daytona(daytonaConfig);

  console.log('✅ Daytona SDK initialized successfully');

  // Create a new sandbox
  let sandbox;
  try {
    console.log('🔄 Creating Daytona sandbox...');
    onProgress?.('🔄 Creating sandbox...');
    sandbox = await daytona.create({
      public: true,
      image: 'node:20'
    });
    console.log('✅ Sandbox created successfully:', sandbox.id);
  } catch (error: any) {
    console.error('❌ Failed to create Daytona sandbox');
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode || error.response?.status,
      errorCode: error.code,
      timestamp: error.timestamp,
      path: error.path,
      method: error.method,
      responseData: error.response?.data,
      fullError: JSON.stringify(error, null, 2)
    });

    // Provide helpful error message
    if (error.message?.includes('runner info')) {
      throw new Error(`Daytona runner not found. This usually means:
1. Invalid DAYTONA_TARGET (current: ${process.env.DAYTONA_TARGET})
2. No runner available in the specified target region
3. API URL incorrect (current: ${process.env.DAYTONA_API_URL})

Original error: ${error.message}`);
    }

    throw error;
  }

  // Get user root directory
  const rootDir = await sandbox.getUserRootDir();
  console.log('📂 Root directory:', rootDir);
  onProgress?.('📂 Setting up project directory...');

  console.log('📁 Uploading files to sandbox...');
  onProgress?.('📁 Uploading files to sandbox...');

  // Write all files to the sandbox using uploadFiles with full paths
  await sandbox.fs.uploadFiles(
    files.map(file => ({
      source: Buffer.from(file.content),
      destination: `${rootDir}/${file.path}`
    }))
  );
  console.log('✅ Files uploaded');
  onProgress?.('✅ Files uploaded');

  // Verify files were uploaded
  console.log('🔍 Verifying uploaded files...');
  const lsResult = await sandbox.process.executeCommand('ls -la', rootDir);
  console.log('📋 Files in directory:', lsResult.result);

  // Check if package.json exists
  const pkgCheck = await sandbox.process.executeCommand(
    'test -f package.json && echo "found" || echo "missing"',
    rootDir
  );
  console.log('📦 Package.json check:', pkgCheck.result?.trim());

  // Install dependencies
  console.log('📦 Installing npm dependencies...');
  onProgress?.('📦 Installing dependencies...');

  const installResult = await sandbox.process.executeCommand(
    'npm install',
    rootDir,
    undefined,
    300000 // 5 minute timeout
  );

  if (installResult.exitCode !== 0) {
    console.error('❌ npm install failed:', installResult.result);
    throw new Error(`npm install failed: ${installResult.result}`);
  }

  console.log('✅ Dependencies installed');
  onProgress?.('✅ Dependencies installed');

  // Start Next.js dev server on port 3000 using nohup (background process with logging)
  console.log('🚀 Starting Next.js dev server...');
  onProgress?.('🚀 Starting Next.js dev server...');

  await sandbox.process.executeCommand(
    'nohup npm run dev > dev-server.log 2>&1 &',
    rootDir,
    { PORT: '3000' }
  );
  console.log('✅ Server command sent');

  // Wait for server to initialize
  console.log('⏳ Waiting for server to start (8 seconds)...');
  onProgress?.('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Check if server is running on localhost
  console.log('📝 Checking server health...');
  const healthCheck = await sandbox.process.executeCommand(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
    rootDir
  );

  if (healthCheck.result?.trim() === '200') {
    console.log('✅ Server is running!');
    onProgress?.('✅ Server started successfully!');
  } else {
    console.log('⚠️ Server might still be starting, checking logs...');
    onProgress?.('⚠️ Checking server logs...');

    // Read server logs for debugging
    const logsResult = await sandbox.process.executeCommand('cat dev-server.log', rootDir);
    const logs = logsResult.result || '';
    console.log('📋 Server logs:', logs);

    // Check for SUCCESSFUL startup patterns FIRST
    const serverReady = logs.includes('✓ Ready in') ||
                        logs.includes('Ready in') ||
                        logs.includes('started server on') ||
                        logs.includes('○ Compiling');

    if (serverReady) {
      console.log('✅ Server started successfully! (found "Ready" message)');
      onProgress?.('✅ Server is running!');
      // Server is up - ignore non-critical errors like fonts/favicon
    } else {
      // Server didn't report ready - check if there are CRITICAL errors
      console.warn('⚠️ No "Ready" message found, checking for critical errors...');

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
        console.error('❌ Critical server error:', errorMsg);
        onProgress?.(`❌ Critical error: ${errorMsg.substring(0, 100)}`);
        throw new Error(`Server failed to start: ${errorMsg}`);
      }

      // No "Ready" message but no critical errors either - continue anyway
      console.warn('⚠️ Server status unclear (no "Ready" or critical errors), will try preview...');
      onProgress?.('⚠️ Server status unclear, trying preview...');
    }
  }

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
