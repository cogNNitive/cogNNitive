/**
 * Falsification suite for block-dangerous-git.mjs.
 *
 * Run: node .claude/hooks/block-dangerous-git.test.mjs
 *
 * The regexes distinguish cases that differ by one character (`git add .` vs
 * `git add .claude/x`, `git commit -am` vs `git commit --amend`), so they are
 * worth pinning. Not wired into CI: the hook is a Claude Code local guardrail,
 * not part of the shipped product.
 *
 * Note the `G` / `HARD` string splitting below — without it this file's own
 * source would match the patterns and the hook would block any shell command
 * that reads or writes it.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'block-dangerous-git.mjs');
const G = 'g' + 'it';
const HARD = '--' + 'hard';

const run = (cmd) =>
  spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { command: cmd } }),
    encoding: 'utf8',
  }).status;

const mustBlock = [
  `${G} reset ${HARD} HEAD~1`,
  `${G} clean -fd`,
  `${G} stash push -u`,
  `${G} branch -D feat/x`,
  `${G} checkout .`,
  `${G} restore .`,
  `${G} checkout -- .`,
  `${G} add -A`,
  `${G} add .`,
  `${G} commit -am wip`,
  `cd /tmp && ${G} reset ${HARD} abc`,
];

const mustAllow = [
  `${G} push origin dev`,
  `${G} reset --soft HEAD~1`,
  `${G} checkout HEAD -- src/foo.ts`,
  `${G} add .claude/settings.json`,
  `${G} add -- path/to/file.ts`,
  `${G} commit --amend --no-edit`,
  `${G} commit -m msg`,
  `${G} status --porcelain`,
  `${G} worktree add --detach /tmp/x abc`,
  `${G} rm --cached .atl/skill-registry.md`,
  `${G} restore --staged src/foo.ts`,
  // Read-only escapes: these inspect without moving the tree.
  `${G} stash list`,
  `${G} stash show -p`,
  `${G} clean -n`,
  `${G} clean --dry-run`,
  `${G} clean -nd`,
];

let failures = 0;

console.log('MUST BLOCK (expect exit 2):');
for (const cmd of mustBlock) {
  const status = run(cmd);
  const ok = status === 2;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} exit=${status}  ${cmd}`);
}

console.log('\nMUST ALLOW (expect exit 0):');
for (const cmd of mustAllow) {
  const status = run(cmd);
  const ok = status === 0;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} exit=${status}  ${cmd}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
