#!/usr/bin/env node
/**
 * PreToolUse guardrail: the primary checkout is read-only for editing.
 *
 * Under session isolation (one `git worktree` per session), a session must edit
 * inside its worktree. This hook denies file-edit tools and `git add/commit/stash`
 * when the session's cwd resolves to the PRIMARY checkout (`.git` is a directory),
 * while a worktree (`.git` is a file) passes through. Read tools and the
 * integration git ops (`merge`, `push`, `tag`, `fetch`) are always allowed, so the
 * primary stays usable as the integration/release point.
 *
 * Handles both the Claude Code and Antigravity PreToolUse payload shapes.
 * Exit 2 blocks; exit 0 allows.
 */
import { statSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const WRITE_TOOLS = new Set([
  'Edit', 'Write', 'MultiEdit', 'NotebookEdit', // Claude Code
  'replace_file_content', 'create_file', 'write_file', 'edit_file', // Antigravity
])

function normalize(payload) {
  if (payload.tool_name) {
    return { toolName: payload.tool_name, command: payload.tool_input?.command, cwd: payload.cwd }
  }
  const tc = payload.toolCall
  const ws = Array.isArray(payload.workspacePaths) ? payload.workspacePaths[0] : undefined
  return { toolName: tc?.name, command: tc?.args?.CommandLine, cwd: tc?.args?.Cwd || ws }
}

function findGitDir(start) {
  let dir = resolve(start)
  for (;;) {
    const dotgit = join(dir, '.git')
    if (existsSync(dotgit)) return dotgit
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function isPrimaryCheckout(cwd) {
  const dotgit = findGitDir(cwd)
  if (!dotgit) return false
  try {
    return statSync(dotgit).isDirectory()
  } catch {
    return false
  }
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => {
  raw += c
})
process.stdin.on('end', () => {
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const { toolName, command, cwd } = normalize(payload)
  if (!isPrimaryCheckout(cwd || process.cwd())) {
    process.exit(0)
  }

  const writeTool = WRITE_TOOLS.has(toolName)
  const gitStage = typeof command === 'string' && /git\s+(add|commit|stash)(?![A-Za-z0-9_.-])/.test(command)

  if (writeTool || gitStage) {
    process.stderr.write(
      'BLOCKED: the primary checkout is read-only (integration/release only). ' +
        'Work in a session worktree: `node scripts/nn-session.mjs start`.\n',
    )
    process.exit(2)
  }

  process.exit(0)
})
