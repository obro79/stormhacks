import { NextRequest } from 'next/server';
import { callClaude, extractTextFromResponse } from '@/lib/api';
import { listProjectFiles, readMultipleFiles, writeMultipleFiles } from '@/lib/daytona-editor';
import { identifyRelevantFiles } from '@/lib/file-targeter';
import { ClaudeMessage, FileChange } from '@/lib/types';
import { logStep, logTotal } from '@/lib/performance-logger';

const EDIT_SYSTEM_PROMPT = `You are an expert full-stack developer AI assistant helping users fix and improve their Next.js applications.

The user has a running Next.js app deployed on Daytona. They may report errors, request changes, or ask for improvements.

When responding:
1. Analyze the current code and the user's request/error
2. Provide a clear explanation of the issue and your solution
3. Generate the updated files that fix the problem

Format your response EXACTLY as follows:

<explanation>
Brief explanation of what you found and how you're fixing it
</explanation>

<files>
FILE: path/to/file.ext
\`\`\`
updated file contents here
\`\`\`

FILE: path/to/another-file.ext
\`\`\`
updated file contents here
\`\`\`
</files>

Rules:
- Each file must start with "FILE: " followed by the file path
- File content must be wrapped in triple backticks
- Only include files that need to be changed (not all files)
- Generate complete, working code (not partial changes)
- If no code changes are needed, just provide explanation without <files> section`;

function parseFilesFromResponse(text: string): FileChange[] {
  const files: FileChange[] = [];

  // Extract content between <files> tags
  const filesMatch = text.match(/<files>([\s\S]*?)<\/files>/);
  if (!filesMatch) {
    return files;
  }

  const filesContent = filesMatch[1];

  // Split by FILE: markers
  const fileBlocks = filesContent.split(/FILE:\s+/).filter(block => block.trim());

  for (const block of fileBlocks) {
    // Extract path and content
    const lines = block.trim().split('\n');
    const path = lines[0].trim();

    // Extract content between triple backticks
    const contentMatch = block.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (contentMatch && path) {
      const content = contentMatch[1].trim();
      files.push({
        path,
        content,
        operation: 'create',
      });
    }
  }

  return files;
}

function extractExplanation(text: string): string {
  const explanationMatch = text.match(/<explanation>([\s\S]*?)<\/explanation>/);
  return explanationMatch ? explanationMatch[1].trim() : '';
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now();

  try {
    const { message, sandboxId, conversationHistory } = await request.json();

    if (!message || !sandboxId) {
      return new Response(
        JSON.stringify({ error: 'Missing message or sandboxId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n💬 Chat request:', { message, sandboxId });

    // Step 1: List all project files
    const allFilePaths = await logStep(1, 6, 'Listing project files', async () => {
      const paths = await listProjectFiles(sandboxId);
      console.log(`   → Found ${paths.length} project files`);
      return paths;
    });

    // Step 2: Identify relevant files based on edit prompt
    const relevantFilePaths = await logStep(2, 6, 'Identifying relevant files', async () => {
      const paths = identifyRelevantFiles(message, allFilePaths);
      console.log(`   → Targeting ${paths.length} relevant file(s): ${paths.join(', ')}`);
      return paths;
    });

    // Step 3: Read only the relevant files
    const currentFiles = await logStep(3, 6, `Reading ${relevantFilePaths.length} file(s)`, async () => {
      return await readMultipleFiles(sandboxId, relevantFilePaths);
    }, { warnThreshold: 3000 });

    // Step 4: Prepare context for Claude
    const { filesContext, messages } = await logStep(4, 6, 'Preparing context for Claude', async () => {
      const context = currentFiles
        .map(f => `FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');

      const msgs: ClaudeMessage[] = [];

      if (conversationHistory && Array.isArray(conversationHistory)) {
        msgs.push(...conversationHistory);
      }

      msgs.push({
        role: 'user',
        content: `Current application code:\n\n${context}\n\n---\n\nUser request: ${message}`,
      });

      console.log(`   → Context size: ${context.length} chars`);
      return { filesContext: context, messages: msgs };
    });

    // Step 5: Call Claude to generate edits
    const { text, explanation, updatedFiles } = await logStep(5, 6, 'Calling Claude API', async () => {
      const response = await callClaude(messages, EDIT_SYSTEM_PROMPT, {
        maxTokens: 16000,
        temperature: 0.7,
      });

      const responseText = extractTextFromResponse(response);
      const exp = extractExplanation(responseText);
      const files = parseFilesFromResponse(responseText);

      console.log(`   → Generated ${files.length} updated file(s)`);
      if (files.length > 0) {
        console.log(`   → Updated files: ${files.map(f => f.path).join(', ')}`);
      }

      return { text: responseText, explanation: exp, updatedFiles: files };
    }, { warnThreshold: 10000 });

    // Step 6: Write updated files to sandbox (hot reload will handle the rest)
    if (updatedFiles.length > 0) {
      await logStep(6, 6, `Writing ${updatedFiles.length} file(s) to sandbox`, async () => {
        await writeMultipleFiles(sandboxId, updatedFiles);
        console.log('   → Next.js hot reload will apply changes');
      }, { warnThreshold: 2000 });
    } else {
      console.log('⏱️  [Step 6/6] No files to write - skipped');
    }

    // Log total time
    logTotal('REQUEST COMPLETE', requestStart);

    // Return response
    const assistantMessage = explanation || 'I\'ve analyzed your request.';
    const fullResponse = updatedFiles.length > 0
      ? `${assistantMessage}\n\n✅ Updated ${updatedFiles.length} file(s). Changes will appear in the preview momentarily via hot reload.`
      : assistantMessage;

    return new Response(
      JSON.stringify({
        success: true,
        message: fullResponse,
        filesUpdated: updatedFiles.length,
        explanation,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logTotal('REQUEST FAILED', requestStart);
    console.error('❌ Chat error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
