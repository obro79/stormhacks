# Code Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up codebase by removing emoji console.logs, fixing hardcoded values, standardizing error responses, and improving type safety.

**Architecture:** Four parallel tracks, each touching separate files to avoid conflicts.

**Tech Stack:** TypeScript, Next.js

---

## Parallel Execution Strategy

These 4 tracks can run simultaneously - each touches different files:

| Track | Files | Tasks |
|-------|-------|-------|
| **A** | `githubService.ts`, `vercelService.ts` | Fix hardcoded username |
| **B** | `page.tsx`, `builder/page.tsx` | Remove emoji console.logs |
| **C** | `daytona.ts` | Remove emoji console.logs + type safety |
| **D** | All API routes | Remove emoji console.logs + standardize errors |

---

## Track A: Fix Hardcoded Username

**Files:**
- Modify: `src/lib/githubService.ts:19`
- Modify: `src/lib/vercelService.ts:18`

**Step 1: Update githubService.ts**

Change the username default from hardcoded fallback to required:

```typescript
// Before:
username: string = process.env.GITHUB_USERNAME || 'owenfisher47'

// After:
username: string = process.env.GITHUB_USERNAME || ''
```

**Step 2: Update vercelService.ts**

Same change - remove hardcoded fallback:

```typescript
// Before:
username: string = process.env.GITHUB_USERNAME || 'owenfisher47'

// After:
username: string = process.env.GITHUB_USERNAME || ''
```

**Step 3: Commit**

```bash
git add src/lib/githubService.ts src/lib/vercelService.ts
git commit -m "fix: remove hardcoded username fallback"
```

---

## Track B: Frontend Console.log Cleanup

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/builder/page.tsx`

**Step 1: Clean page.tsx**

Remove all emoji console.log statements. Keep error logs but remove emojis.

Search pattern: `console.log("🚀`, `console.log("📝`, `console.log("🆔`, etc.

Replace with nothing (delete the lines) or convert to plain format for errors only.

**Step 2: Clean builder/page.tsx**

Same approach - remove emoji console.logs.

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/builder/page.tsx
git commit -m "chore: remove emoji console.logs from frontend"
```

---

## Track C: Daytona.ts Cleanup

**Files:**
- Modify: `src/lib/daytona.ts`

**Step 1: Remove emoji console.logs**

Remove all `console.log("🚀`, `console.log("📦`, `console.log("✅`, etc.

Keep `console.error` but remove emojis.

**Step 2: Fix type safety for error handling**

Replace unsafe `unknown` casts with proper type guards:

```typescript
// Before (line ~101-117):
catch (error: unknown) {
  if (error instanceof Error && isRecord(error)) {
    const errorRecord = error as Record<string, unknown>;
    // unsafe property access
  }
}

// After:
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Failed to create sandbox:', message);
}
```

**Step 3: Commit**

```bash
git add src/lib/daytona.ts
git commit -m "chore: clean up daytona.ts logging and type safety"
```

---

## Track D: API Routes Cleanup

**Files:**
- Modify: `src/app/api/build-stream/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/cleanup/route.ts`
- Modify: `src/app/api/commit/route.ts`
- Modify: `src/app/api/deploy/route.ts`
- Modify: `src/app/api/download/route.ts`
- Modify: `src/app/api/edit/route.ts`
- Modify: `src/app/api/files/route.ts`
- Modify: `src/app/api/init/route.ts`

**Step 1: Remove emoji console.logs from all routes**

Remove `console.log("🚀`, `console.log("📦`, etc. from all API routes.

**Step 2: Standardize error response format**

Ensure all routes use consistent format:
```typescript
{ success: false, error: "message here" }
```

Not `message`, always `error`.

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "chore: clean up API routes logging and standardize errors"
```

---

## Final Step: Verify Build

After all tracks complete:

```bash
npm run build
```

Ensure no TypeScript errors introduced.
