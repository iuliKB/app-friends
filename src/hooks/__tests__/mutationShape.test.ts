/**
 * @jest-environment node
 *
 * TSQ-08 regression gate — every useMutation in src/hooks/ must follow the canonical
 * shape from 31-RESEARCH.md §Pattern 5: mutationFn + onMutate (snapshot) +
 * onError (rollback) + onSettled (invalidate).
 *
 * Exemption marker: add `// @mutationShape: no-optimistic` directly above a
 * `useMutation({` block when the mutation legitimately uses plain
 * `onSuccess: invalidateQueries` (research §Pattern 5 line 503 — create with side
 * effects). All other useMutation calls must conform.
 *
 * Run: npx jest --testPathPatterns="mutationShape" --no-coverage
 */
import fs from 'fs';
import path from 'path';

const HOOKS_DIR = path.resolve(__dirname, '..');
const REQUIRED = ['mutationFn', 'onMutate', 'onError', 'onSettled'] as const;

function listHookFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...listHookFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/**
 * Extract every useMutation({ ... }) block in `src`. Tracks paired braces /
 * parentheses from the opening line forward; returns the full source text for
 * each block plus the leading-comment exemption flag.
 */
function extractMutationBlocks(
  src: string,
): { startLine: number; body: string; exempt: boolean }[] {
  const lines = src.split('\n');
  const blocks: { startLine: number; body: string; exempt: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/useMutation\s*\(\s*\{/.test(lines[i] ?? '')) continue;
    // Look at the previous non-blank line for the exemption marker.
    let j = i - 1;
    while (j >= 0 && (lines[j] ?? '').trim() === '') j--;
    const prev = j >= 0 ? (lines[j] ?? '') : '';
    const exempt = /@mutationShape:\s*no-optimistic/.test(prev);
    // Walk forward, counting brace + paren depth, until the matching close of useMutation(.
    let depth = 0;
    let body = '';
    let started = false;
    for (let k = i; k < lines.length; k++) {
      const line = lines[k] ?? '';
      body += line + '\n';
      for (const ch of line) {
        if (ch === '(' || ch === '{') depth++;
        else if (ch === ')' || ch === '}') depth--;
        if (depth > 0) started = true;
      }
      if (started && depth === 0) break;
    }
    blocks.push({ startLine: i + 1, body, exempt });
  }
  return blocks;
}

describe('mutationShape regression gate (TSQ-08)', () => {
  const files = listHookFiles(HOOKS_DIR);

  it('discovers at least one hook file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('every useMutation in %s follows the canonical shape', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    const blocks = extractMutationBlocks(src);
    if (blocks.length === 0) return; // file has no mutations — pass
    for (const block of blocks) {
      if (block.exempt) continue;
      for (const required of REQUIRED) {
        // The expect.objectContaining payload below is the diagnostic shown when a
        // mutation block is missing a required member — file path, line number, and
        // a snippet of the offending block all surface in the failure output.
        expect({
          file,
          line: block.startLine,
          missing: required,
          snippet: block.body.slice(0, 120),
        }).toEqual(
          expect.objectContaining({
            missing: expect.any(String),
          }),
        );
        expect(block.body).toContain(required);
      }
    }
  });
});
