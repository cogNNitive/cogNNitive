# claim: derived-regen-gate

branch: session/derived-regen-gate
pr: 702
opened: 2026-11-16
thread: backlog batch b4a-derived-artifacts (derived-artifacts-consolidation)

area:
  - scripts/regen.js
  - scripts/verify.js
  - scripts/lib/freshness-guards.js
  - scripts/lib/regen-gate.js
  - scripts/lib/regen-gate.test.js
  - package.json
  - .github/workflows/ci.yml
  - openspec/backlog_NN.md
  - openspec/claims/derived-regen-gate.md

overlap:
  # Accepted overlap, recorded 2026-11-16 by claim-check.
  - openspec/backlog_NN.md: also claimed by session/backlog-grill (openspec/claims/backlog-grill.md).
    This session edits ONLY the derived-artifacts-consolidation item block and its batch line,
    last commit before the PR, so a collision is one line and not a rebase of the file.
  - package.json: also touched by open PR #696 (dependabot dev-dependency bump).
    This session adds one `check:regen` script line; #696 only edits devDependencies.
