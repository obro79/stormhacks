import { describe, expect, it } from 'vitest';
import {
  isValidGitHubUsername,
  isValidRepoName,
  isValidSessionId,
  sanitizeRelativePath,
} from '../validation';

describe('isValidSessionId', () => {
  it('accepts IDs in the format the client generates', () => {
    expect(isValidSessionId('build-1759658000000-k3j2h1x')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['shell metacharacters', 'abc; rm -rf /'],
    ['path segments', '../etc'],
    ['too long', 'a'.repeat(65)],
    ['non-string', 42],
    ['missing', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isValidSessionId(value)).toBe(false);
  });
});

describe('sanitizeRelativePath', () => {
  it.each([
    ['src/app/page.tsx', 'src/app/page.tsx'],
    ['/src/app/page.tsx', 'src/app/page.tsx'],
    ['./package.json', 'package.json'],
    ['src//lib/../lib/utils.ts', 'src/lib/utils.ts'],
    ['src\\app\\layout.tsx', 'src/app/layout.tsx'],
  ])('normalizes %s -> %s', (input, expected) => {
    expect(sanitizeRelativePath(input)).toBe(expected);
  });

  it.each(['../secrets.env', 'src/../../etc/passwd', '..', '', '   ', '/'])(
    'rejects %j, which escapes or is empty',
    input => {
      expect(() => sanitizeRelativePath(input)).toThrow(/Invalid file path/);
    }
  );
});

describe('isValidGitHubUsername', () => {
  it.each(['obro79', 'a', 'some-user'])('accepts %s', name => {
    expect(isValidGitHubUsername(name)).toBe(true);
  });

  it.each(['', '-leading', 'trailing-', 'has_underscore', 'a'.repeat(40)])('rejects %j', name => {
    expect(isValidGitHubUsername(name)).toBe(false);
  });
});

describe('isValidRepoName', () => {
  it('accepts names produced by buildRepoName', () => {
    expect(isValidRepoName('echome-pomodoro-timer-1759657000000')).toBe(true);
  });

  it.each(['', 'has space', 'owner/repo', 'a'.repeat(101)])('rejects %j', name => {
    expect(isValidRepoName(name)).toBe(false);
  });
});
