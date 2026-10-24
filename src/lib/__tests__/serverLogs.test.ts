import { describe, expect, it } from 'vitest';
import { classifyDevServerLogs } from '../serverLogs';

describe('classifyDevServerLogs', () => {
  it('reports ready when next dev prints its ready line', () => {
    const logs = '  ▲ Next.js 15.5.4\n  - Local: http://localhost:3000\n ✓ Ready in 2.1s';
    expect(classifyDevServerLogs(logs)).toEqual({ status: 'ready' });
  });

  it('treats a ready server as ready even if it also logged an error', () => {
    const logs = ' ✓ Ready in 1.8s\nFailed to compile favicon.ico';
    expect(classifyDevServerLogs(logs).status).toBe('ready');
  });

  it('returns the first critical error line', () => {
    const logs = 'npm run dev\nError: Cannot find module "react"\nat foo';
    expect(classifyDevServerLogs(logs)).toEqual({
      status: 'error',
      error: 'Error: Cannot find module "react"',
    });
  });

  it('detects a port already in use', () => {
    expect(classifyDevServerLogs('Error: listen EADDRINUSE: address already in use :::3000').status).toBe('error');
  });

  it('is unknown when there is no signal either way', () => {
    expect(classifyDevServerLogs('> next dev\n')).toEqual({ status: 'unknown' });
  });
});
