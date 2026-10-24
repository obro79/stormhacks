import { describe, expect, it } from 'vitest';
import { parseFilesFromResponse } from '../parseFiles';

const fence = '```';

describe('parseFilesFromResponse', () => {
  it('extracts every FILE block inside <files>', () => {
    const text = [
      '<thinking>plan</thinking>',
      '<files>',
      'FILE: package.json',
      `${fence}json`,
      '{ "name": "app" }',
      fence,
      '',
      'FILE: src/app/page.tsx',
      `${fence}tsx`,
      'export default function Page() { return <h1>Hi</h1>; }',
      fence,
      '</files>',
    ].join('\n');

    expect(parseFilesFromResponse(text)).toEqual([
      { path: 'package.json', content: '{ "name": "app" }', operation: 'create' },
      {
        path: 'src/app/page.tsx',
        content: 'export default function Page() { return <h1>Hi</h1>; }',
        operation: 'create',
      },
    ]);
  });

  it('returns nothing when the <files> section is missing', () => {
    expect(parseFilesFromResponse(`FILE: a.ts\n${fence}\nx\n${fence}`)).toEqual([]);
  });

  it('skips blocks that have no fenced body', () => {
    const text = `<files>\nFILE: empty.ts\nno fence here\nFILE: ok.ts\n${fence}ts\nconst ok = 1;\n${fence}\n</files>`;
    expect(parseFilesFromResponse(text).map(f => f.path)).toEqual(['ok.ts']);
  });

  it('accepts language tags with hyphens and fences without a tag', () => {
    const text = `<files>\nFILE: a.sh\n${fence}shell-session\necho hi\n${fence}\nFILE: b.txt\n${fence}\nplain\n${fence}\n</files>`;
    expect(parseFilesFromResponse(text).map(f => f.content)).toEqual(['echo hi', 'plain']);
  });

  it('keeps nested directories and trims surrounding whitespace in content', () => {
    const text = `<files>\nFILE:   src/components/ui/Button.tsx  \n${fence}tsx\n\n  export const Button = () => null;\n\n${fence}\n</files>`;
    expect(parseFilesFromResponse(text)).toEqual([
      { path: 'src/components/ui/Button.tsx', content: 'export const Button = () => null;', operation: 'create' },
    ]);
  });
});
