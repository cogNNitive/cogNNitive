---
name: nn-dev-spec-version-propagator
description: >
  Keep the single default-version constant in sync after an iNNfo (L0/L1) spec
  bump, and detect any stray reference to a removed/legacy spec path. Since
  `spec-versioning` made every spec artifact immutable and filename-encoded
  (a bump always creates a new file; nothing downstream is ever silently
  repointed), this skill's job is now narrow: update the one source-of-truth
  constant and confirm the checker script finds no leftover references to the
  old file.
trigger: >
  spec version bump, propagate version, version propagation, update spec version,
  actualizar versión especificación, version bump, bump spec, check spec version,
  stale version references, update format version
source: iNNfo
version: "2.0.0"
---

# Spec Version Propagator (residual scope)

## Purpose

Before `spec-versioning` (see `openspec/changes/archive/*/specs/spec-versioning/spec.md`
once archived, or the live `openspec/specs/spec-versioning/spec.md`), a spec bump had to be
manually propagated across a 13-category fan-out: templates, models, samples, test
fixtures, source constants, docs, and CHANGELOGs. That fan-out is gone by design —
every spec artifact under `specs/` is immutable and filename-encoded
(`specs/iNNfo_V_x-y-z_NN.md`, `specs/templates/{name}/{name}_V_x-y-z_NN.md`). A bump
**always creates a new file**; every existing consumer keeps pointing at the exact
file it was authored against, so there is nothing to silently repoint or break.

This skill's residual job is two mechanical checks, both scoped to the L0/L1 specs
(`defiNNe`, `iNNfo`) — L2 template bumps do **not** need this skill, since nothing
consumes an L2 template implicitly by "latest" anymore (see the passive
template-version badge in `spec-versioning`'s D3 for how consumers learn about a
newer L2 template, out of scope here):

1. **Keep `DEFAULT_INNFO_VERSION` in sync.** `apps/innfo-editor/src/utils/constants.ts`
   holds the single source-of-truth default L1 version used when a model omits
   `spec_version`. When `specs/iNNfo_V_x-y-z_NN.md` is bumped, update this constant
   to match.
2. **Confirm no stray legacy references remain.** After any spec change (bump,
   rename, deletion), run the checker script in `--check` mode against the *old*
   version/path to confirm nothing still points at it.

## Companion Script

The **canonical detection tool** is `scripts/check-spec-version.mjs`.

```bash
# Scan for all files still referencing an old/removed version
node scripts/check-spec-version.mjs --version V_0-1-2

# Same, but categorize by file type
node scripts/check-spec-version.mjs --version V_0-1-2 --by-type

# Check mode: exit code 1 if any stale references found (for CI/commit hooks)
node scripts/check-spec-version.mjs --version V_0-1-2 --check

# Scan for ALL known spec versions in the repo (inventory mode, excludes archives)
node scripts/check-spec-version.mjs --inventory

# Verify every hardcoded raw.githubusercontent.com URL in source files still
# resolves to an existing file under the current specs/ tree
node scripts/check-spec-version.mjs --check-urls

# Extend any scan to the bundled skill docs/templates in cogNNitive/actioNN
# (auto-detects ../actioNN/skills; silently skipped if not checked out)
node scripts/check-spec-version.mjs --check-urls --with-skills
node scripts/check-spec-version.mjs --version V_0-1-2 --by-type --with-skills
```

The `npm run` aliases wrap the common cases: `check:spec-version`,
`check:spec-urls`, and `check:specs` (urls + inventory). CI runs `check:spec-urls`
in the `spec-integrity` job.

> **Note:** By default, `archive/` and any directory named `archive` inside
> `openspec/` are excluded. Use `--include-archives` for a comprehensive scan when
> auditing history, not when gating a change.

## Procedure

### Bumping the L1 spec (`iNNfo`)

1. Create the new file: `specs/iNNfo_V_x-y-z_NN.md` (never edit the previous
   version file in place).
2. Update `DEFAULT_INNFO_VERSION` in
   `apps/innfo-editor/src/utils/constants.ts` to the new version.
3. Run `node scripts/check-spec-version.mjs --version <old-version> --check` to
   confirm no file still assumes the old version is current (a non-zero exit means
   something — typically a doc or fixture — still hardcodes the old value; fix and
   re-run).

### Bumping the L0 spec (`defiNNe`)

Same as above, minus the constant update — `defiNNe` has no corresponding
source-code default (it is only referenced via `parent` from the L1 spec).

### Bumping an L2 template

No propagation step is required. Create the new versioned file under
`specs/templates/{name}/`; existing models keep resolving against the version they
were authored with (write-once guarantee, `spec-resolution` R-LSR-02). The
D3 badge (`spec-versioning`, out of scope for this skill) is how a user *learns*
a newer template version exists; this skill does not drive that flow.

### Deleting or renaming a spec path

Run `node scripts/check-spec-version.mjs --check-urls` after the change to confirm
no hardcoded `raw.githubusercontent.com` URL in `.ts`/`.vue` source now points at a
path that no longer exists.

## File Pattern Reference

The script scans these glob-equivalent patterns (see `check-spec-version.mjs`'s
`classifyFile`/`collectFiles` for the exact logic — it walks the whole repo minus
`node_modules`/`.git`/`archive` dirs, so no explicit glob list needs to be kept in
sync here):

| Category | Typical location | What version field is checked |
|---|---|---|
| Spec (L0/L1) | `specs/*_NN.md` | filename, `spec_version`, `parent` (L1 only — a string URL pointing to its L0 parent; L0 has no parent) |
| Template (L2) | `specs/templates/{name}/*_NN.md` | filename, `spec_version`, `template_version`, `parent_spec` |
| Model / Sample | `specs/templates/{name}/samples/*_NN.md`, `apps/**/tests/fixtures/**/*.md` | filename, `model_version`, `parent_spec` |
| Test | `**/*.test.ts`, `**/*.spec.ts` | inline frontmatter strings |
| Source | `apps/**/src/**/*.{ts,vue}`, `packages/**/src/**/*.ts` | `DEFAULT_INNFO_VERSION`, hardcoded template/sample URLs |
| Docs | `docs/**/*.md` | version string references |
| Changelog | `CHANGELOG.md` (repo root — the only changelog; `specs/CHANGELOG.md` was removed by `spec-versioning`) | version entries |

## URL Format

```
spec_url / parent / parent_spec.url:
  "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md"
  "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/business/business_V_0-1-0_NN.md"
```

Always `main` branch, never a git tag — the filename itself is the pin (see
`spec-versioning`, A4). There is no `specs/latest/`, `specs/v0.x.y/`, or
`models/specs/` alias to choose between anymore.
