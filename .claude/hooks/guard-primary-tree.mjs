#!/usr/bin/env node
/**
 * PreToolUse guardrail: the primary checkout is read-only for editing.
 *
 * Under session isolation (one `git worktree` per session), a session must edit
 * inside its worktree. This hook denies file-edit tools and `git add/commit/stash`
 * when the operation TARGETS the PRIMARY checkout (`.git` is a directory), while a
 * worktree (`.git` is a file) passes through. Read tools and the integration git
 * ops (`merge`, `push`, `tag`, `fetch`) are always allowed, so the primary stays
 * usable as the integration/release point.
 *
 * The target is resolved from the payload, not merely from the session cwd:
 *  - a write tool's `tool_input.file_path` (Claude Code) or `TargetFile` /
 *    `AbsolutePath` (Antigravity), falling back to the session cwd when absent;
 *  - the directory named by `git -C <dir>`, falling back to the session cwd.
 *
 * This is what lets a subagent started from the primary edit a file inside a
 * worktree, while still blocking a write into the primary from any cwd.
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

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

function normalize(payload) {
  if (payload.tool_name) {
    const input = payload.tool_input || {}
    return {
      toolName: payload.tool_name,
      command: input.command,
      cwd: payload.cwd,
      targetPath: firstString(input.file_path, input.notebook_path, input.path),
    }
  }
  const tc = payload.toolCall
  const ws = Array.isArray(payload.workspacePaths) ? payload.workspacePaths[0] : undefined
  const args = tc?.args || {}
  return {
    toolName: tc?.name,
    command: args.CommandLine,
    cwd: args.Cwd || ws,
    targetPath: firstString(args.TargetFile, args.AbsolutePath, args.path, args.target),
  }
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

function isPrimaryCheckout(start) {
  const dotgit = findGitDir(start)
  if (!dotgit) return false
  try {
    return statSync(dotgit).isDirectory()
  } catch {
    return false
  }
}

/**
 * Matches a staging command and captures the `git -C <dir>` chdir target when
 * present. The `-C` option is how a subagent run from the primary targets a
 * worktree (and vice versa), so it must win over the session cwd.
 */
const GIT_STAGING_RE =
  /\bgit\s+(?:-C\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s+)?(add|commit|stash)(?![A-Za-z0-9_.-])/

function gitStaging(command) {
  if (typeof command !== 'string') return null
  const match = GIT_STAGING_RE.exec(command)
  if (!match) return null
  return { dir: match[1] || match[2] || match[3] || undefined }
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

  const { toolName, command, cwd, targetPath } = normalize(payload)
  const baseCwd = cwd || process.cwd()

  // Resolve the directory whose git repo the operation actually touches.
  let subject
  if (WRITE_TOOLS.has(toolName)) {
    subject = targetPath ? resolve(baseCwd, targetPath) : baseCwd
  } else {
    const staging = gitStaging(command)
    if (!staging) process.exit(0)
    subject = staging.dir ? resolve(baseCwd, staging.dir) : baseCwd
  }

  if (!isPrimaryCheckout(subject)) {
    process.exit(0)
  }

  process.stderr.write(
    'BLOCKED: the primary checkout is read-only (integration/release only). ' +
      'Work in a session worktree: `node scripts/nn-session.mjs start`.\n',
  )
  process.exit(2)
})
