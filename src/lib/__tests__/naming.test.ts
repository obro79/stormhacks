import { describe, expect, it } from 'vitest';
import { buildRepoName, generateProjectName } from '../naming';
import { isValidRepoName } from '../validation';

describe('generateProjectName', () => {
  it('keeps the first three words longer than three letters', () => {
    expect(generateProjectName('Build me a Pomodoro timer with sounds')).toBe('build-pomodoro-timer');
  });

  it('strips punctuation', () => {
    expect(generateProjectName("Make a typing-test app, please!")).toBe('make-typingtest-please');
  });

  it.each([undefined, '', 'a to do'])('falls back to "project" for %j', prompt => {
    expect(generateProjectName(prompt)).toBe('project');
  });
});

describe('buildRepoName', () => {
  it('prefixes, slugifies and timestamps the name', () => {
    expect(buildRepoName('Battleship Game!', 1759657000000)).toBe('echome-battleship-game-1759657000000');
  });

  it('caps the slug at 50 characters', () => {
    const name = buildRepoName('x'.repeat(80), 1);
    expect(name).toBe(`echome-${'x'.repeat(50)}-1`);
  });

  it('never produces an empty slug', () => {
    expect(buildRepoName('!!!', 1)).toBe('echome-project-1');
  });

  it('always yields a name the Vercel deploy step accepts', () => {
    for (const input of ['Finance App', '  spaces  ', 'émoji 🚀 app', 'a--b']) {
      expect(isValidRepoName(buildRepoName(input, 123))).toBe(true);
    }
  });
});
