import { describe, expect, it } from 'vitest';
import { formatSseEvent, isTerminalMessage } from '../progress';

describe('build progress protocol', () => {
  it.each([
    ['COMPLETE:https://3000-abc.proxy.daytona.works', true],
    ['ERROR:Claude API error', true],
    ['Installing dependencies...', false],
    ['Error: something (not terminal, no colon prefix)', false],
  ])('isTerminalMessage(%j) is %s', (message, expected) => {
    expect(isTerminalMessage(message)).toBe(expected);
  });

  it('formats an SSE data frame the builder page can JSON.parse', () => {
    const frame = formatSseEvent('Uploading "files"\n...');
    expect(frame.startsWith('data: ')).toBe(true);
    expect(frame.endsWith('\n\n')).toBe(true);
    expect(JSON.parse(frame.slice(6))).toEqual({ message: 'Uploading "files"\n...' });
  });
});
