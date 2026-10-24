import path from 'path';

// Session IDs are generated client-side as `build-<timestamp>-<random>`.
export const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

// GitHub usernames: alphanumeric or single hyphens, max 39 chars, no leading/trailing hyphen.
export function isValidGitHubUsername(username: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

export function isValidRepoName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(name);
}

/**
 * Normalize a model-generated file path into a safe relative path.
 * Leading slashes and `./` are dropped; anything that would escape the
 * project root (e.g. `../../etc/passwd`) throws.
 */
export function sanitizeRelativePath(filePath: string): string {
  const trimmed = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  const normalized = path.posix.normalize(trimmed);

  if (!trimmed || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  return normalized;
}
