#!/usr/bin/env node

/**
 * scripts/check-tag-pin-freshness-cli.js
 *
 * Thin CLI wrapper around scripts/lib/tag-pin-freshness.js, invoked from
 * `.githooks/pre-push` for each pushed ref whose *remote* ref is
 * `refs/heads/main` (see that hook for the stdin-driven ref filtering).
 *
 * Kept as its own file instead of an inline `node -e` in the hook: the hook
 * must stay POSIX sh and readable, and this needs argument parsing plus
 * structured error output — awkward to inline cleanly, and this file gets
 * its own test suite (a shell hook does not).
 *
 * Usage:
 *   node scripts/check-tag-pin-freshness-cli.js --base <sha> --head <sha> [--repo-root <path>]
 *
 * Exit codes:
 *   0 - clean, or diff range unresolvable (skipped; a short notice is printed to stderr)
 *   1 - violation (skills/ or a template spec_NN.md changed without a
 *       manifest/source.yaml re-pin in the same diff)
 *   2 - usage error (missing --base/--head)
 */

const path = require('path');
const { checkTagPinFreshness } = require('./lib/tag-pin-freshness.js');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--head') args.head = argv[++i];
    else if (argv[i] === '--repo-root') args.repoRoot = argv[++i];
  }
  return args;
}

function main() {
  const { base, head, repoRoot } = parseArgs(process.argv.slice(2));
  if (!base || !head) {
    console.error('Usage: node scripts/check-tag-pin-freshness-cli.js --base <sha> --head <sha> [--repo-root <path>]');
    process.exit(2);
  }

  const resolvedRepoRoot = repoRoot || path.join(__dirname, '..');
  const result = checkTagPinFreshness(resolvedRepoRoot, { base, head });

  if (result.skipped) {
    console.error('check-tag-pin-freshness: skipped (diff range not resolvable).');
    process.exit(0);
  }

  if (!result.ok) {
    console.error('❌ Tag/pin freshness violation (push to main blocked):');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  process.exit(0);
}

main();
