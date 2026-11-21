#!/usr/bin/env node
/**
 * The primary checkout is read-only: it is the integration and release point.
 * Every session works in its own `git worktree`, where `.git` is a file. In the
 * primary checkout `.git` is a directory, which is the only signal needed.
 *
 * This guard exists because the harness-level PreToolUse hooks (`.claude/settings.json`,
 * `.agents/hooks.json`) are read by Claude Code and Antigravity only. OpenCode reads
 * neither, so under OpenCode the "primary is read-only" rule had no enforcement at
 * all, and sessions merged, amended and rebased branches inside the shared tree while
 * other threads were live in it. A git hook lives below every harness.
 *
 * Wire-up (see `.githooks/`): `pre-commit`, `pre-merge-commit` and `pre-rebase` refuse
 * to run in the primary checkout. `core.hooksPath` is already `.githooks`, so a
 * worktree inherits the same hooks and passes them.
 *
 * Exit 1 blocks the git operation; exit 0 allows it.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Nearest ancestor (or self) that contains `.git`, walking up from `start`. */
export function findGitDir(start) {
  let dir = resolve(start)
  for (;;) {
    const dotgit = join(dir, '.git')
    if (existsSync(dotgit)) return dotgit
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * True when `start` lives in the primary checkout. A linked worktree has `.git` as a
 * file (a `gitdir:` pointer); the primary has it as a directory. Returns false when
 * there is no repository, so the guard never blocks a non-repository command.
 */
export function isPrimaryCheckout(start) {
  const dotgit = findGitDir(start)
  if (!dotgit) return false
  try {
    return statSync(dotgit).isDirectory()
  } catch {
    return false
  }
}

/**
 * Throws the standard refusal on stderr and returns the exit code to use.
 * `action` names the refused operation so the message says what was blocked.
 *
 * @param {string} action
 * @param {{ cwd?: string, stderr?: { write: (chunk: string) => unknown }, env?: Record<string, string | undefined> }} [options]
 * @returns {0 | 1}
 */
export function guard(
  action,
  { cwd = process.cwd(), stderr = process.stderr, env = process.env } = {},
) {
  // A CI runner's only checkout IS a primary checkout, and the write-back lane on `main`
  // commits there by design. The rule protects a developer's shared tree, not a lone job,
  // so GitHub Actions steps aside. Deliberately not `CI`: a developer with that exported
  // would lose the guard without knowing it.
  if (env.GITHUB_ACTIONS === 'true') return 0
  if (!isPrimaryCheckout(cwd)) return 0
  stderr.write(
    `BLOCKED: ${action} in the primary checkout, which is read-only ` +
      '(integration and release only).\n' +
      'Work in a session worktree instead:\n' +
      '  node scripts/nn-session.mjs start --id <short-kebab-id>\n' +
      '  node scripts/nn-session.mjs status\n',
  )
  return 1
}

function main(argv = process.argv.slice(2)) {
  const action = argv[0] || 'git write'
  process.exitCode = guard(action)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
