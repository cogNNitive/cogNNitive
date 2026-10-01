#!/usr/bin/env node
/**
 * PreToolUse guardrail: refuses the git commands whose blast radius is a whole
 * working tree. Under the session-isolation model (one worktree per session),
 * these can no longer erase another session's work — but they can still erase
 * THIS session's uncommitted work in one stroke, so they stay blocked as cheap
 * self-harm insurance.
 *
 * The staging commands (`git add -A`, `git add .`, `git commit -a`) are
 * DELIBERATELY NOT blocked: a session worktree holds only that session's own
 * work, so there are no foreign paths to accidentally stage.
 *
 * Written in Node rather than bash + jq on purpose: Node is already required by
 * this repo, jq is not installed here, and a hook that silently exits 0 because
 * its parser is missing is worse than no hook at all.
 *
 * End-of-token boundaries below are `(?![A-Za-z0-9_.-])`, not `(\s|$)`. A
 * command usually continues with a shell operator, so a whitespace-only
 * boundary lets `git reset --hard;` through and stops `git stash list; echo`
 * from matching its own read-only escape. Regex literals throughout.
 *
 * Exit 2 blocks the call and shows `reason` to the agent. Exit 0 allows it.
 */

const RULES = [
  {
    pattern: /reset\s+--hard/,
    reason:
      'git reset --hard resets the ENTIRE index and working tree, discarding your uncommitted work. ' +
      'To drop a commit but keep the tree use `git reset --soft HEAD~1`. ' +
      'To revert one file you authored use `git checkout HEAD -- <explicit/path>`.',
  },
  {
    // -n / --dry-run only reports what would be removed.
    pattern: /git\s+clean/,
    unless: /(^|\s)(-[a-zA-Z]*n[a-zA-Z]*|--dry-run)(?![A-Za-z0-9_.-])/,
    reason:
      'git clean deletes untracked files across the tree, including your own in-progress work. ' +
      'Delete the specific paths you created instead, or pass --dry-run to inspect.',
  },
  {
    // list and show are read-only; everything else moves the tree.
    pattern: /git\s+stash/,
    unless: /git\s+stash\s+(list|show)(?![A-Za-z0-9_.-])/,
    reason:
      'git stash sweeps up every uncommitted change in the tree in one go. ' +
      'To get a clean tree for a build or a check, use `git worktree add --detach <tmp> <sha>` instead. ' +
      'Listing and showing stashes is allowed.',
  },
  {
    pattern: /git\s+branch\s+-D/,
    reason: 'git branch -D force-deletes a branch without a merge check. Use -d, or confirm with the user first.',
  },
  {
    pattern: /git\s+(checkout|restore)\s+(--\s+)?\.(?![A-Za-z0-9_.-])/,
    reason:
      'Reverting the whole tree discards your uncommitted work. ' +
      'Name the file: `git checkout HEAD -- <explicit/path>`.',
  },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let command;
  try {
    command = JSON.parse(raw)?.tool_input?.command;
  } catch {
    // Fail loudly rather than silently: we cannot judge what we cannot read,
    // but a guardrail that disappears without a word is how this repo lost
    // 58 uncommitted changes once already.
    process.stderr.write('block-dangerous-git: could not parse hook payload; command NOT checked.\n');
    process.exit(0);
  }

  if (typeof command !== 'string' || command.length === 0) {
    process.exit(0);
  }

  for (const { pattern, unless, reason } of RULES) {
    if (pattern.test(command) && !(unless && unless.test(command))) {
      process.stderr.write(`BLOCKED: ${command}\n\n${reason}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
});
