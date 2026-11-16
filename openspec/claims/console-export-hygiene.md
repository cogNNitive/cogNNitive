# claim: console-export-hygiene

branch: session/console-export-hygiene
opened: 2026-11-16
thread: opencode subagent (batch b10g2 — export-console hygiene: d14, d16, d17, d19, d20)

area:
  - scripts/export-console.mjs
  - scripts/console-views.mjs
  - scripts/export-console.test.mjs
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-export-hygiene.md

# Scope: five small items of batch b10g2 in one file, landed in this order.
# d14 console-builder-d14-scope-key-order: `scopeKeyOf` derives the key prefix from the
# canonical (slash-normalized, path-sorted) model order instead of the caller's list
# order, so the scope key is the same for any permutation of `selected`.
# d16 console-builder-d16-code-unit-compare: `compareCodeUnits` is exported by the views
# lib and used at every ordering site in the exporter, so no `localeCompare` is left in
# the two files and the two modules cannot drift.
# d17 console-builder-d17-rendertree-branches: `renderTree` prints one loop for both the
# root group and a directory group; `--tree` output is byte-identical.
# d19 console-builder-d19-changeset-counts: per-model change counts aggregate the
# changesets once into a Map keyed by model part, walked through a Set of the model's
# title/id/stem; per-model counts are identical.
# d20 console-builder-d20-data-theme-guard: the `data-theme=` guard after CSS inlining
# can never fire with the shipped assets (the inlined stylesheet always contains the
# literal) and is deleted; the shell's own `<html data-theme="light">` is the guarantee.
#
# Accepted overlap: claim-check reports 18 overlaps, all from claim files left behind by
# landed sessions (console-fixture-assets PR #664, console-scan-errors PR #665,
# console-views-hygiene PR #666, console-focus-mount PR #668, console-identity-freshness
# PR #669, console-provenance PR #670). `gh pr list --state open` is empty, so no live
# session holds these paths; the stale claim files are left in place (never deleted by
# another session) and this session lands after their merges. This session only retires
# the five items above: their status and evidence lines, never another item and never a
# batch-zone line.

pr: 673
