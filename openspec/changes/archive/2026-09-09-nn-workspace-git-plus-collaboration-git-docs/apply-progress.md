# Apply Progress: nn-workspace-git plus collaboration-git docs

- **Change**: `2026-09-09-nn-workspace-git-plus-collaboration-git-docs`
- **Branch**: `dev` · **Commit**: `bbdddf5 feat(skills): gated nn-workspace-git alpha skill and git collaboration guide`
- **Date**: 2026-09-12 (retro-persisted per verify report)
- **Mode**: Strict TDD (runner: `npm --prefix iNNfo run test`)

## TDD Cycle Evidence

The change is docs/skill-only (`nn-workspace-git` skill with `disable-model-invocation: true`
plus the collaboration-git documentation page). No product code was introduced, so the
apply-time validation was ad-hoc (frontmatter parse, sidebar regen, boundary diff, English
scan). Per the verify report, the mechanical spec scenarios are now covered by the persisted
fixture suite `actioNN/skills/nn-workspace-git/test/skill-contract.test.js`.

| Task | Test File | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 1.1 Frontmatter + gate contract | `skill-contract.test.js` §1 | node:assert | ✅ fixture written before assertion run | ✅ pass | ✅ 10 fields + gate text | ➖ n/a |
| 1.2 Private repo + `.gitignore` + secret-untracked | `skill-contract.test.js` §2 | node:assert | ✅ | ✅ pass | ✅ skill + docs both asserted | ➖ n/a |
| 1.3 Two-layer version→commit map | `skill-contract.test.js` §3 | node:assert | ✅ | ✅ pass | ✅ header + template + concrete ISO rows | ➖ n/a |
| 2.1 Guide Page renders under Guides | `skill-contract.test.js` §4 | node:assert | ✅ | ✅ pass | ✅ Page block + sidebar entry | ➖ n/a |
| 3.1 English-only scan | `skill-contract.test.js` §5 | node:assert | ✅ | ✅ pass | ✅ scanner sensitivity (pos+neg) | ➖ n/a |

Run: `node actioNN/skills/nn-workspace-git/test/skill-contract.test.js` → all sections pass.

## Additional apply-time validations performed (ad-hoc)

- **Sidebar regeneration**: `node scripts/generate-docsify-suite.mjs docs/innfo/documentation/documentation_NN.md --sidebar-only` → exit 0; entry `- [Collaboration with Git](collaboration-git)` present (line 20); idempotent (zero git diff after regen).
- **Missing-source abort**: code inspection of `generate-docsify-suite.mjs` L307-318 — missing `source::` increments `auditErrors` → `process.exit(1)`.
- **Boundary**: `git diff --stat actioNN/skills/nn-innfo/SKILL.md` → empty (nn-innfo untouched).
- **Manifest**: entry deliberately deferred to `chore(release)` per amended spec (precedent `73cbc64`); verified append/revert live without committing.
- **Frontmatter parse**: 10 fields exact-match to design contract.

## Notes

- Full `npm --prefix iNNfo run test` and `node scripts/verify.js` are red in the shared tree
  due to foreign sibling WIP (`repository`/`video-generator` templates) — provably NOT this change.
- Review workload: single commit `bbdddf5` = 775 changed lines (> 400 budget); acknowledged
  under cached `single-pr-default` strategy.