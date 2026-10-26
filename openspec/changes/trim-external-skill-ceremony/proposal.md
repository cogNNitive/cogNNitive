# Proposal: Trim referenced-external-skill ceremony

## Why

A bluepriNNt may *reference* a third-party skill in its frontmatter `skills:` array. The
mechanism shipped (change `2026-10-10-blueprint-external-skills`) before any bluepriNNt
adopted it, and carries ceremony disproportionate to its **zero** current usage:

1. A `sha256` tree digest that duplicates the already-immutable `commit` pin — a git commit
   SHA content-addresses the exact tree, so the digest re-verifies what the pin already
   guarantees. It adds a spec requirement, a policy check, a schema field and an install
   step for marginal defense-in-depth.
2. A `ref` field (tag/branch → commit) that is **never resolved**: the policy is pure and
   offline, so no network check exists, and the field is display-only.
3. A `distribution: vendored` value that contradicts the mechanism's own rule ("referenced,
   never vendored"). It exists only to gate a redistribution allowlist nothing uses.

The load-bearing parts are cheap and legitimate: the `commit` pin (immutability), the SPDX
`license` (compliance) and the consent-gated `install-external` (a third-party trust
boundary). Those stay.

## What Changes

- **`sha256` is demoted to an optional, unenforced field.** The external-skill policy no
  longer requires, warns about, or validates it, and the `blueprint-external-skills`
  "External Skill Integrity Digest" requirement is removed. The shared
  `skill-tree-digest` utility and the `install-external --sha256` flag are untouched (they
  are general install machinery, not this contract).
- **`ref` is retired.** It was never resolved; the pin is the `commit`.
- **`distribution` is retired.** With no `vendored` path, the field has no purpose.
- **The `external-skills` guard** (`scripts/verify.js`) now enforces only the pin + license.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `blueprint-external-skills`: the entry contract is `{ name, repo, path, commit, license }`
  plus `source_template`; the policy enforces pin + license only; the integrity-digest
  requirement is removed.
- `template-package-structure`: a referenced skill is pinned to a `commit` and declares a
  `license` (no `sha256`).
- `template-procedures-manifest-and-discovery`: the external entry contract and the
  discovery output carry `commit` and `license`, not `sha256`/`ref`/`distribution`.

## Impact

| Area | Impact | Description |
|---|---|---|
| `scripts/manifest/lib/external-skill-policy.js` | Modified | Drop the `sha256` and `vendored` checks; keep `commit`/`license` + commit shape |
| `scripts/manifest/lib/external-skill-policy.test.js` | Modified | Aligned tests |
| `scripts/verify.js` | Modified | `external-skills` guard enforces the trimmed policy (from the same change's guard wiring) |
| `openspec/specs/blueprint-external-skills/spec.md` | Modified | Delta: contract + policy trimmed; digest requirement removed |
| `openspec/specs/template-package-structure/spec.md` | Modified | Delta: drop `sha256` from the reference clause |
| `openspec/specs/template-procedures-manifest-and-discovery/spec.md` | Modified | Delta: entry/discovery field set trimmed |
| `docs/innfo/template-package-spec.md` | Modified | Example + guarantee-tiers prose |
| `iNNfo/specs/vocabulary.json` + `docs/documentation/content/vocabulary.md` | Modified | Remove `sha256`/`distribution` from the "referenced skill" sense |
| `skills/nn-skills-lifecycle/SKILL.md` + its doc + `skills/README.md` | Modified | Drop digest language |

## Not in scope (deferred)

- Pruning the tolerant `ref`/`sha256`/`distribution` keys from the `nn-core` parser
  (`iNNfo/packages/nn-core/src/types/parser.ts`, `parser/yaml.ts`) and the `nn-mcp`
  discovery passthrough (`iNNfo/packages/nn-mcp/src/tools/spec.ts`). A tolerant parser
  preserving unknown keys is harmless; the prune belongs in a session that can build and
  run the Vitest suites (this one has no installed workspace deps).

## Success Criteria

- [ ] `node scripts/manifest/lib/external-skill-policy.test.js` is green.
- [ ] `node scripts/verify.js --only=external-skills` passes.
- [ ] `rg "sha256" scripts/manifest/lib/external-skill-policy.js` returns 0.
- [ ] No live doc presents `sha256`/`ref`/`distribution: vendored` as part of the referenced-skill contract.
- [ ] `node scripts/generate-vocabulary-doc.mjs --check` is green.

## Rollback Plan

Revert the change. It is confined to one policy module, its test, specification/delta text
and documentation; no runtime data is migrated and no blueprint declares an external skill
yet.
