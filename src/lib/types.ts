export interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'edit' | 'delete';
}

export interface BuildRequest {
  prompt: string;
}

export interface BuildResponse {
  success: boolean;
  files: FileChange[];
  message?: string;
  thinking?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: string;
    text?: string;
    thinking?: string;
  }>;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
    thinking?: string;
  }>;
  model: string;
  stop_reason: string;
}
