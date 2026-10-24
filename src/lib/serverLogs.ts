const READY_PATTERNS = ['Ready in', 'started server on', 'Compiling'];

const CRITICAL_PATTERNS = [
  'EADDRINUSE',
  'MODULE_NOT_FOUND',
  'Cannot find module',
  'Failed to compile',
  'Error: listen',
];

export type DevServerStatus =
  | { status: 'ready' }
  | { status: 'error'; error: string }
  | { status: 'unknown' };

/**
 * Classify `next dev` output from the sandbox. A ready signal wins over
 * errors, since a running server can still log non-fatal noise.
 */
export function classifyDevServerLogs(logs: string): DevServerStatus {
  if (READY_PATTERNS.some(pattern => logs.includes(pattern))) {
    return { status: 'ready' };
  }

  const errorLine = logs
    .split('\n')
    .find(line => CRITICAL_PATTERNS.some(pattern => line.includes(pattern)));

  if (errorLine) {
    return { status: 'error', error: errorLine.trim() };
  }

  return { status: 'unknown' };
}
