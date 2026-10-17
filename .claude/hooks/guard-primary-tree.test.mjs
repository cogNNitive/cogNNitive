/**
 * Falsification suite for guard-primary-tree.mjs.
 *
 * Run: node .claude/hooks/guard-primary-tree.test.mjs
 *
 * The `.git` file-vs-directory heuristic is what distinguishes the primary
 * checkout (block writes) from a worktree (allow). Not wired into CI: the hook
 * is a local agent guardrail, not part of the shipped product.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-primary-tree.mjs')
const G = 'g' + 'it'

const base = mkdtempSync(path.join(tmpdir(), 'guard-primary-'))
const primary = path.join(base, 'repo')
const worktree = path.join(base, 'wt')
mkdirSync(path.join(primary, '.git'), { recursive: true }) // directory = primary
mkdirSync(worktree, { recursive: true })
writeFileSync(path.join(worktree, '.git'), 'gitdir: ../repo/.git/worktrees/wt\n') // file = worktree

const run = (payload) =>
  spawnSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' }).status

const claude = (cwd, tool_name, command) => ({ cwd, tool_name, tool_input: command ? { command } : {} })

let failures = 0
const expect = (label, status, want) => {
  const ok = status === want
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} exit=${status} want=${want}  ${label}`)
}

console.log('PRIMARY (expect block=2 for writes, allow=0 for read/integration):')
expect('Write tool', run(claude(primary, 'Write')), 2)
expect('Edit tool', run(claude(primary, 'Edit')), 2)
expect(`git add -A`, run(claude(primary, 'Bash', `${G} add -A`)), 2)
expect(`git commit -m x`, run(claude(primary, 'Bash', `${G} commit -m x`)), 2)
expect(`git stash push`, run(claude(primary, 'Bash', `${G} stash push -u`)), 2)
expect(`git merge main`, run(claude(primary, 'Bash', `${G} merge origin/main`)), 0)
expect(`git push origin dev`, run(claude(primary, 'Bash', `${G} push origin dev`)), 0)
expect(`git tag`, run(claude(primary, 'Bash', `${G} tag skills-v2.9.0`)), 0)
expect('Read tool', run(claude(primary, 'Read')), 0)
expect('gate run', run(claude(primary, 'Bash', 'node scripts/verify.js')), 0)

console.log('\nWORKTREE (expect allow=0 for writes):')
expect('Write tool', run(claude(worktree, 'Write')), 0)
expect(`git add -A`, run(claude(worktree, 'Bash', `${G} add -A`)), 0)
expect(`git commit -m x`, run(claude(worktree, 'Bash', `${G} commit -m x`)), 0)

console.log('\nOUTSIDE REPO (expect allow=0):')
expect('Write tool', run(claude(base, 'Write')), 0)

// --- Target resolution: tool_input.file_path wins over the session cwd ---
mkdirSync(path.join(primary, 'src'), { recursive: true })
mkdirSync(path.join(worktree, 'src'), { recursive: true })

const claudeFile = (cwd, tool_name, file_path) => ({ cwd, tool_name, tool_input: { file_path } })

console.log('\nCLAUDE CODE — absolute file_path (target, not cwd):')
expect(
  'primary cwd → write into WORKTREE (allow)',
  run(claudeFile(primary, 'Write', path.join(worktree, 'src', 'a.ts'))),
  0,
)
expect(
  'worktree cwd → edit in PRIMARY (block)',
  run(claudeFile(worktree, 'Edit', path.join(primary, 'src', 'a.ts'))),
  2,
)
expect(
  'primary cwd → write in PRIMARY (block)',
  run(claudeFile(primary, 'Write', path.join(primary, 'x.md'))),
  2,
)

console.log('\nCLAUDE CODE — relative file_path resolves against cwd:')
expect(
  'worktree cwd + relative path (allow)',
  run(claudeFile(worktree, 'Write', path.join('src', 'a.ts'))),
  0,
)
expect('primary cwd + relative path (block)', run(claudeFile(primary, 'Write', path.join('src', 'a.ts'))), 2)

console.log('\nANTIGRAVITY — TargetFile resolves the target:')
const antigravity = (cwd, name, args) => ({ toolCall: { name, args }, workspacePaths: [cwd] })
expect(
  'primary cwd → replace_file_content in WORKTREE (allow)',
  run(antigravity(primary, 'replace_file_content', { TargetFile: path.join(worktree, 'src', 'a.ts') })),
  0,
)
expect(
  'worktree cwd → create_file in PRIMARY (block)',
  run(antigravity(worktree, 'create_file', { AbsolutePath: path.join(primary, 'src', 'b.ts') })),
  2,
)

// --- git -C <dir> wins over the session cwd ---
const git = (cwd, args) => claude(cwd, 'Bash', `${G} ${args}`)

console.log('\ngit -C target:')
expect(`git -C worktree add (from primary) → allow`, run(git(primary, `-C "${worktree}" add -A`)), 0)
expect(`git -C primary add (from worktree) → block`, run(git(worktree, `-C "${primary}" add -A`)), 2)
expect(`git -C primary commit (from primary) → block`, run(git(primary, `-C "${primary}" commit -m x`)), 2)
expect(`git -C worktree stash (from primary) → allow`, run(git(primary, `-C "${worktree}" stash push -u`)), 0)

rmSync(base, { recursive: true, force: true })
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
