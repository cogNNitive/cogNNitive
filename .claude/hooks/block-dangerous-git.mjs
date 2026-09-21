#!/usr/bin/env node
/**
 * PreToolUse guardrail: refuses git commands whose blast radius is the whole
 * working tree.
 *
 * This checkout is routinely shared by concurrent agent sessions, so at any
 * moment it may hold uncommitted work this session did not author. The commands
 * below cannot be scoped to a pathspec — they act on everything — which makes
 * "only touch your own files" impossible to honour once they run.
 *
 * Written in Node rather than bash + jq on purpose: Node is already required by
 * this repo, jq is not installed here, and a hook that silently exits 0 because
 * its parser is missing is worse than no hook at all.
 *
 * Exit 2 blocks the call and shows `reason` to the agent. Exit 0 allows it.
 */

const RULES = [
  {
    pattern: /reset\s+--hard/,
    reason:
      'git reset --hard resets the ENTIRE index and working tree; there is no pathspec-scoped form. ' +
      'To drop a commit but keep the tree use `git reset --soft HEAD~1`. ' +
      'To revert one file you authored use `git checkout HEAD -- <explicit/path>`.',
  },
  {
    pattern: /git\s+clean/,
    reason:
      'git clean deletes untracked files across the tree, including another session\'s in-progress work. ' +
      'Delete the specific paths you created instead.',
  },
  {
    pattern: /git\s+stash/,
    reason:
      'git stash sweeps up every uncommitted change in the tree, not just yours. ' +
      'To get a clean tree for a build or a check, use `git worktree add --detach <tmp> <sha>` instead.',
  },
  {
    pattern: /git\s+branch\s+-D/,
    reason: 'git branch -D force-deletes a branch without a merge check. Use -d, or confirm with the user first.',
  },
  {
    pattern: /git\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/,
    reason:
      'Reverting the whole tree discards changes you did not author. ' +
      'Name the file: `git checkout HEAD -- <explicit/path>`.',
  },
  {
    pattern: /git\s+add\s+(-A|--all)(\s|$)/,
    reason: 'git add -A stages every change in the tree, including other sessions\'. Stage explicit pathspecs.',
  },
  {
    pattern: /git\s+add\s+\.(\s|$)/,
    reason: 'git add . stages every change under the cwd, including other sessions\'. Stage explicit pathspecs.',
  },
  {
    pattern: /git\s+commit\s+(-[a-zA-Z]*a[a-zA-Z]*|--all)(\s|$)/,
    reason:
      'git commit -a auto-stages every tracked modification, including other sessions\'. ' +
      'Stage explicit pathspecs, then commit without -a.',
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

  for (const { pattern, reason } of RULES) {
    if (pattern.test(command)) {
      process.stderr.write(`BLOCKED: ${command}\n\n${reason}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
});
