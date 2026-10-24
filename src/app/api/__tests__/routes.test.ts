import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { filesStore } from '@/lib/filesStore';

vi.mock('@/lib/deployHelpers', () => ({
  deployToGitHubAndVercel: vi.fn(async () => ({
    success: true,
    message: 'ok',
    deploymentUrl: 'https://demo.vercel.app',
    githubUrl: 'https://github.com/someone/demo',
    repoName: 'demo',
  })),
}));

vi.mock('@/lib/daytona', () => ({
  deleteAllSandboxes: vi.fn(async () => ({ deleted: 2, ids: ['a', 'b'] })),
}));

const { POST: deploy } = await import('../deploy/route');
const { POST: cleanup } = await import('../cleanup/route');
const { GET: getFiles } = await import('../files/route');

const SESSION = 'build-1759658000000-abc1234';

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  filesStore.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/deploy', () => {
  it('rejects a malformed session ID', async () => {
    const res = await deploy(jsonRequest('http://localhost/api/deploy', { sessionId: 'x; rm -rf /' }));
    expect(res.status).toBe(400);
  });

  it('rejects a missing session ID instead of deploying anything else', async () => {
    const res = await deploy(jsonRequest('http://localhost/api/deploy', { deployType: 'full' }));
    expect(res.status).toBe(400);
  });

  it('404s when the session has no generated files', async () => {
    const res = await deploy(jsonRequest('http://localhost/api/deploy', { sessionId: SESSION }));
    expect(res.status).toBe(404);
  });

  it('deploys stored files and returns both URLs', async () => {
    filesStore.set(SESSION, [{ path: 'package.json', content: '{}', operation: 'create' }]);

    const res = await deploy(jsonRequest('http://localhost/api/deploy', { sessionId: SESSION, projectPrompt: 'demo' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      deploymentUrl: 'https://demo.vercel.app',
      githubUrl: 'https://github.com/someone/demo',
      filesDeployed: 1,
    });
  });
});

describe('POST /api/cleanup', () => {
  it('is disabled when CLEANUP_TOKEN is unset', async () => {
    vi.stubEnv('CLEANUP_TOKEN', '');
    const res = await cleanup(jsonRequest('http://localhost/api/cleanup', {}));
    expect(res.status).toBe(401);
  });

  it('rejects the wrong token', async () => {
    vi.stubEnv('CLEANUP_TOKEN', 'secret');
    const res = await cleanup(jsonRequest('http://localhost/api/cleanup', {}, { authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
  });

  it('deletes sandboxes with the right token', async () => {
    vi.stubEnv('CLEANUP_TOKEN', 'secret');
    const res = await cleanup(jsonRequest('http://localhost/api/cleanup', {}, { authorization: 'Bearer secret' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, deleted: 2 });
  });
});

describe('GET /api/files', () => {
  it('returns stored files for a valid session', async () => {
    filesStore.set(SESSION, [{ path: 'a.ts', content: 'x', operation: 'create' }]);
    const res = await getFiles(new NextRequest(`http://localhost/api/files?sessionId=${SESSION}`));
    expect(res.status).toBe(200);
    expect((await res.json()).files).toHaveLength(1);
  });

  it('rejects an invalid session ID', async () => {
    const res = await getFiles(new NextRequest('http://localhost/api/files?sessionId=../../x'));
    expect(res.status).toBe(400);
  });
});
