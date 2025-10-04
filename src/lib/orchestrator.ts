import { callClaude, extractTextFromResponse, extractThinkingFromResponse } from './api';
import { BuildResponse, FileChange, ClaudeMessage } from './types';

const SYSTEM_PROMPT = `You are an expert full-stack developer AI assistant that generates complete, production-ready code.

When given a prompt to build an application, you should:
1. Think through the architecture and required files
2. Generate complete, working code for all necessary files
3. Use modern best practices and clean code principles
4. Include proper TypeScript types, error handling, and comments

Format your response EXACTLY as follows:

<thinking>
Your reasoning about the app architecture, tech stack decisions, and implementation approach
</thinking>

<files>
FILE: path/to/file.ext
\`\`\`
file contents here
\`\`\`

FILE: path/to/another-file.ext
\`\`\`
file contents here
\`\`\`
</files>

Rules:
- Each file must start with "FILE: " followed by the file path
- File content must be wrapped in triple backticks
- Generate complete, runnable code (not pseudocode or TODOs)
- Include all necessary files (components, utils, types, etc.)
- Use modern React, TypeScript, and Next.js patterns
- Make the code production-ready`;

export async function buildApp(prompt: string): Promise<BuildResponse> {
  try {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await callClaude(messages, SYSTEM_PROMPT, {
      maxTokens: 8000,
      temperature: 1,
    });

    const thinking = extractThinkingFromResponse(response);
    const text = extractTextFromResponse(response);

    // Parse the response to extract files
    const files = parseFilesFromResponse(text);

    return {
      success: true,
      files,
      thinking,
      message: `Generated ${files.length} file(s)`,
    };
  } catch (error) {
    console.error('Error building app:', error);
    return {
      success: false,
      files: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

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

export async function editApp(
  prompt: string,
  currentFiles: { path: string; content: string }[]
): Promise<BuildResponse> {
  try {
    const filesContext = currentFiles
      .map(f => `FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Current files:\n\n${filesContext}\n\nEdit request: ${prompt}`,
      },
    ];

    const response = await callClaude(messages, SYSTEM_PROMPT, {
      maxTokens: 8000,
      temperature: 1,
    });

    const thinking = extractThinkingFromResponse(response);
    const text = extractTextFromResponse(response);
    const files = parseFilesFromResponse(text);

    return {
      success: true,
      files,
      thinking,
      message: `Modified ${files.length} file(s)`,
    };
  } catch (error) {
    console.error('Error editing app:', error);
    return {
      success: false,
      files: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
