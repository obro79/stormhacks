import { callClaude, extractTextFromResponse, extractThinkingFromResponse } from './api';
import { BuildResponse, ClaudeMessage } from './types';
import { parseFilesFromResponse } from './parseFiles';
import { createDaytonaSandbox, getSandboxUrl } from './daytona';

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

export async function buildApp(prompt: string, onProgress?: (message: string) => void): Promise<BuildResponse> {
  try {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];
    onProgress?.('Calling Claude API...');

    const response = await callClaude(messages, SYSTEM_PROMPT, {
      maxTokens: 16000,
      temperature: 1,
    });
    onProgress?.('Claude generated the code');

    const thinking = extractThinkingFromResponse(response);
    const text = extractTextFromResponse(response);

    // Parse the response to extract files
    const files = parseFilesFromResponse(text);
    onProgress?.(`Generated ${files.length} file(s)`);

    // Create Daytona sandbox with the generated files
    let sandboxId: string | undefined;
    let sandboxUrl: string | undefined;

    try {
      onProgress?.('Deploying to Daytona...');

      sandboxId = await createDaytonaSandbox(files, onProgress);

      sandboxUrl = await getSandboxUrl(sandboxId);
      onProgress?.('Preview is ready!');
    } catch (error) {
      console.warn('Failed to create Daytona sandbox:', error);
      onProgress?.('Failed to deploy to Daytona');
      // Continue without sandbox - still return the files
    }

    return {
      success: true,
      files,
      thinking,
      message: `Generated ${files.length} file(s)${sandboxUrl ? ` - Preview at: ${sandboxUrl}` : ''}`,
      sandboxId,
      sandboxUrl,
    };
  } catch (error) {
    console.error('Error building app:', error);
    onProgress?.(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      files: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
