# claim: console-csp-hash

branch: session/console-csp-hash
opened: 2026-11-16
thread: opencode subagent (batch b10a — CSP hash handling)

area:
  - scripts/console-views.mjs
  - test/console-views-lib.test.mjs
  - test/console-csp.test.mjs
  - iNNfo/specs/bluepriNNts/console/artifact_shell.html
  - openspec/backlog_NN.md
  - openspec/claims/console-csp-hash.md

# Scope: batch b10a. allowInlineScripts finds the CSP meta element with any attribute
# order and any quoting, adds the hashes to the directive that actually governs inline
# script elements (script-src-elem, else script-src, else a script-src created from the
# default-src sources) and throws instead of silently narrowing when a policy has
# neither. Output for the shipped shell is byte-identical. d21 (a test hashing the
# shell's CSP tokens) is deliberately not started: the shell carries four sha256 tokens
# and no executable inline script, so the test its done_when describes needs those
# tokens removed from the shipped shell. That is reported to the parent, not done here.
#
# No batch-zone line and no other backlog item is touched.
