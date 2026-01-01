# Security & Code Quality Fixes Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical security vulnerabilities and important code quality issues identified in code review.

**Architecture:** 8 parallel tracks, each touching separate files to avoid conflicts.

**Tech Stack:** TypeScript, Next.js, React

---

## Parallel Execution Strategy

| Track | Files | Issues to Fix |
|-------|-------|---------------|
| **1** | `api/deploy/route.ts` | Command injection, add input validation |
| **2** | `lib/deployHelpers.ts` | Path traversal, command injection, input validation |
| **3** | `lib/githubService.ts` | Path traversal, username validation, error handling |
| **4** | `lib/vercelService.ts` | Input validation, request timeouts, error handling |
| **5** | `lib/daytona.ts` | Path traversal, resource cleanup, timeouts |
| **6** | `api/build-stream/route.ts` | Memory leak, input validation, error handling |
| **7** | `app/page.tsx`, `api/transcribe/route.ts` (new) | API key proxy, remove client-side key |
| **8** | `app/builder/page.tsx` | XSS fix (validate sandboxUrl), Suspense boundary |

---

## Track 1: Deploy Route Security

**File:** `src/app/api/deploy/route.ts`

### Fix 1.1: Remove shell command with user input

Replace unsafe shell execution with safe approach:

```typescript
// BEFORE (line 93 - VULNERABLE):
command = `bash ${process.cwd()}/scripts/deploy.sh "${message}"`;

// AFTER: Use execFile or remove user input from command
import { execFile } from 'child_process';
const execFileAsync = promisify(execFile);

// Pass message as argument, not interpolated
await execFileAsync('bash', [
  `${process.cwd()}/scripts/deploy.sh`,
  message
], { cwd: process.cwd() });
```

### Fix 1.2: Add input validation

```typescript
// Add at top of POST handler:
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

if (sessionId && !SESSION_ID_PATTERN.test(sessionId)) {
  return NextResponse.json(
    { success: false, error: 'Invalid session ID format' },
    { status: 400 }
  );
}

if (commitMessage && commitMessage.length > 500) {
  return NextResponse.json(
    { success: false, error: 'Commit message too long' },
    { status: 400 }
  );
}
```

---

## Track 2: deployHelpers Security

**File:** `src/lib/deployHelpers.ts`

### Fix 2.1: Path traversal protection

```typescript
// Add helper function:
function validateFilePath(basePath: string, filePath: string): string {
  const resolvedPath = path.resolve(path.join(basePath, filePath));
  if (!resolvedPath.startsWith(path.resolve(basePath) + path.sep)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  return resolvedPath;
}

// Use in file writing loop:
const safePath = validateFilePath(deployDir, file.path);
await fs.writeFile(safePath, file.content, 'utf-8');
```

### Fix 2.2: Fix command injection in git commit

```typescript
// BEFORE (line 85-88 - VULNERABLE):
await execAsync(
  `git commit -m "Deploy sandbox ${sessionId}: ${new Date().toISOString()}"`,
  { cwd: deployDir }
);

// AFTER: Validate sessionId and use safe message
if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
  throw new Error('Invalid session ID');
}
// Use environment variable for message to avoid shell interpretation
const commitMessage = `Deploy sandbox ${sessionId}: ${new Date().toISOString()}`;
await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: deployDir });
```

### Fix 2.3: Add input validation at function entry

```typescript
export async function deploySandboxFiles(
  files: FileChange[],
  sessionId: string
): Promise<DeploymentResult> {
  // Validate inputs
  if (!Array.isArray(files) || files.length === 0) {
    return { success: false, error: 'No files provided' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return { success: false, error: 'Invalid session ID format' };
  }
  // ... rest of function
}
```

---

## Track 3: githubService Security

**File:** `src/lib/githubService.ts`

### Fix 3.1: Path traversal protection

```typescript
// Add validation function:
function sanitizeFilePath(filePath: string): string {
  const normalized = path.normalize(filePath).replace(/^\/+/, '');
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  return normalized;
}

// Use in tree building (around line 141):
const sanitizedPath = sanitizeFilePath(file.path);
tree.push({
  path: sanitizedPath,
  mode: '100644',
  type: 'blob',
  sha: blobData.sha,
});
```

### Fix 3.2: Username validation

```typescript
function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

// At function start:
if (!username || !validateUsername(username)) {
  return { success: false, error: 'Invalid or missing GitHub username' };
}
```

### Fix 3.3: Empty files validation

```typescript
if (!files || files.length === 0) {
  return { success: false, error: 'No files provided to push' };
}
```

---

## Track 4: vercelService Security

**File:** `src/lib/vercelService.ts`

### Fix 4.1: Input validation

```typescript
// Add at function start:
if (!repoName || !/^[a-zA-Z0-9_-]+$/.test(repoName)) {
  return { success: false, error: 'Invalid repository name' };
}
if (!username || !/^[a-zA-Z0-9_-]+$/.test(username)) {
  return { success: false, error: 'Invalid username' };
}
```

### Fix 4.2: Add request timeouts

```typescript
// Create helper:
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Use for all fetch calls
```

### Fix 4.3: Fix misleading success on timeout

```typescript
// Line 141-148 - return pending instead of success
return {
  success: false,
  error: 'Deployment timed out - check Vercel dashboard',
  deploymentUrl,
  projectId,
  deploymentId,
};
```

---

## Track 5: daytona.ts Security

**File:** `src/lib/daytona.ts`

### Fix 5.1: Path traversal in file upload

```typescript
// Add validation before upload:
function sanitizePath(filePath: string): string {
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  return normalized;
}

// In uploadFiles (around line 111):
files.map(file => ({
  source: Buffer.from(file.content),
  destination: `${rootDir}/${sanitizePath(file.path)}`
}))
```

### Fix 5.2: Resource cleanup on failure

```typescript
// In createDaytonaSandbox - wrap in try-finally:
let sandbox;
try {
  sandbox = await daytona.create({ public: true, image: 'node:20' });
  // ... rest of operations
  return sandbox.id;
} catch (error) {
  if (sandbox) {
    try { await sandbox.delete(); } catch {}
  }
  throw error;
}
```

### Fix 5.3: Redact env vars from error messages

```typescript
// Line 93-98 - remove actual values:
throw new Error(`Daytona runner not found. Check DAYTONA_TARGET and DAYTONA_API_URL configuration.`);
```

---

## Track 6: build-stream Memory Leak Fix

**File:** `src/app/api/build-stream/route.ts`

### Fix 6.1: Clean up progressStore on disconnect

```typescript
// In abort handler (lines 90-93):
request.signal.addEventListener('abort', () => {
  clearInterval(interval);
  progressStore.delete(sessionId);  // ADD THIS
  controller.close();
});
```

### Fix 6.2: Add session timeout

```typescript
const startTime = Date.now();
const MAX_SESSION_TIME = 5 * 60 * 1000; // 5 minutes

const interval = setInterval(() => {
  if (Date.now() - startTime > MAX_SESSION_TIME) {
    progressStore.delete(sessionId);
    controller.close();
    clearInterval(interval);
    return;
  }
  // ... rest of polling
}, 500);
```

### Fix 6.3: Add input validation

```typescript
// Validate sessionId format:
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
  return new Response('Invalid sessionId format', { status: 400 });
}
```

### Fix 6.4: Add JSON parse error handling

```typescript
let prompt: string, sessionId: string;
try {
  const body = await request.json();
  prompt = body.prompt;
  sessionId = body.sessionId;
} catch {
  return new Response('Invalid JSON body', { status: 400 });
}
```

---

## Track 7: API Key Proxy

**Files:**
- Create: `src/app/api/transcribe/route.ts`
- Modify: `src/app/page.tsx`

### Fix 7.1: Create server-side transcribe route

```typescript
// NEW FILE: src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: formData,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Transcription service error' },
      { status: 500 }
    );
  }
}
```

### Fix 7.2: Update page.tsx to use proxy

```typescript
// BEFORE (line 104-113):
const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
  headers: { 'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '' },
  ...
});

// AFTER:
const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData,
});
```

---

## Track 8: Builder Page XSS Fix

**File:** `src/app/builder/page.tsx`

### Fix 8.1: Validate sandboxUrl

```typescript
// Add validation function:
function isValidSandboxUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow specific trusted domains
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.daytona.io') ||
       parsed.hostname === 'localhost' ||
       parsed.hostname.endsWith('.vercel.app'))
    );
  } catch {
    return false;
  }
}

// Use when setting sandboxUrl from params (around line 49-52):
const url = searchParams.get('sandboxUrl');
if (url && isValidSandboxUrl(url)) {
  setSandboxUrl(url);
}
```

### Fix 8.2: Add Suspense boundary

```typescript
// Wrap component using useSearchParams:
import { Suspense } from 'react';

function BuilderContent() {
  const searchParams = useSearchParams();
  // ... existing component logic
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
```

### Fix 8.3: Add JSON parse error handling for SSE

```typescript
// Around line 77:
eventSource.onmessage = (event) => {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch {
    console.error('Failed to parse SSE data');
    return;
  }
  // ... rest of handler
};
```

---

## Verification

After all tracks complete:

```bash
npm run build
```

Ensure no TypeScript errors and app builds successfully.

---

## Summary

| Track | Priority | Est. Changes |
|-------|----------|--------------|
| 1 - Deploy route | Critical | ~30 lines |
| 2 - deployHelpers | Critical | ~40 lines |
| 3 - githubService | Critical | ~25 lines |
| 4 - vercelService | Important | ~35 lines |
| 5 - daytona.ts | Important | ~30 lines |
| 6 - build-stream | Important | ~25 lines |
| 7 - API key proxy | Critical | ~40 lines (new file) |
| 8 - Builder XSS | Critical | ~35 lines |

All 8 tracks can run in parallel - no file conflicts.
