/**
 * Derive a short project name from the user's prompt,
 * e.g. "build me a pomodoro timer app" -> "build-pomodoro-timer".
 */
export function generateProjectName(prompt?: string): string {
  if (!prompt) return 'project';

  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3);

  return words.length > 0 ? words.join('-') : 'project';
}

/**
 * Build a unique, GitHub- and Vercel-safe repo name: `echome-<slug>-<timestamp>`.
 */
export function buildRepoName(projectName: string, timestamp: number = Date.now()): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'project';

  return `echome-${slug}-${timestamp}`;
}
