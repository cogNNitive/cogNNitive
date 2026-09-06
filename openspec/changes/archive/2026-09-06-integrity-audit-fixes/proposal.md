# Proposal: Integrity Audit Fixes (2026-09-06)

## Intent

Act on the `nn-dev-check-integrity` full-battery run of 2026-09-06. That run
produced **2 gate blockers** (both on the distribution axis) and **16 confirmed
code-review bugs** across `innfo-core`, `innfo-mcp`, and `innfo-editor`.

This change lands the **contained, low-risk, test-backed subset** now, and
records the rest as an explicit deferred backlog (see `tasks.md` §Deferred).
Bundling 16 cross-package bug fixes into one unreviewed push is the multi-PR
merge-incident pattern this repo has already been bitten by; those fixes each
need their own design pass and are split out deliberately.

## Affected modules

| Module | What changes |
| :--- | :--- |
| `iNNfo/packages/innfo-mcp` | `tsup.config.ts` — force a single-file `bin/` bundle (`splitting: false`); drop the now-stale committed `bin/chunk-*.js` / `bin/spec-*.js` |
| `scripts/` | `build-docs.mjs` — fail the docs build if the staged CDN bundle is not self-contained; `verify.js` — add a stale-manifest guard; `generate-docsify-sidebar.mjs` — correct the signal exit code |
| `iNNfo/packages/innfo-core` | `parser/taxonomy.ts` — per-branch cycle guard in `printTaxonomyNode`; `parser/serializer.ts` — remove the duplicate `parent:` emit |
| `docs/use/` | `manifest.md` + `manifest-next.md` regenerated from `manifest/source.yaml` |

## Scope

### In scope — implemented in this change

**B1 — CDN bundle is broken by construction.**
`bin/innfo-mcp.bundle.js` is code-split (`import … from "./chunk-XXXX.js"`).
`scripts/build-docs.mjs` copies only the single `.bundle.js` into
`docs/innfo/cdn/`, never the sibling chunks, and the chunk name is a
per-build content hash. Any agent installing from
`https://innfo.cognnitive.com/cdn/innfo-mcp-v0.2.4.bundle.js` gets a module
that throws `Cannot find module` at load. `docs/innfo/cdn/*.bundle.js` is
gitignored, so this never shows in a PR diff.
Fix: `splitting: false` on the `bin` tsup config so the bundle is one file
again; a guard in `build-docs.mjs` so a future split fails the build loudly
instead of silently shipping.

**B2 — rendered distribution manifests are stale.**
`docs/use/manifest.md` advertises `nn-innfo` as `V_0-1-2`; the source of truth
(`manifest/source.yaml`, `SKILL.md`) is `V_0-1-3`. The commit that bumped the
pin did not regenerate the rendered manifests, and CI's `build:docs` does not
run `generate-manifest.js`.
Fix: regenerate both channel docs; add
`generate-manifest.js --channel stable --check` (byte-exact, deterministic,
already supported by the script) to `scripts/verify.js`.

**C2 — `serializeModel` infinite-recurses on a cyclic taxonomy.**
`printTaxonomyNode` has no cycle guard; a taxonomy containing `A→B→A` throws
`RangeError: Maximum call stack size exceeded` on the save path.
Fix: track per-branch ancestors and stop when a node is its own ancestor.
Diamonds (a shared child under two parents) keep their current behaviour.

**C5 — `serializeModel` emits a duplicate `parent:` key.**
An unconditional second `parent:` re-emit produces invalid YAML for any
document whose frontmatter carries `parent`.
Fix: delete the redundant block; the `else if` branch already emits it.

**M12 — `generate-docsify-sidebar.mjs` reports success on a signal kill.**
`process.exit(result.status ?? 0)` exits `0` when the child is signal-killed
(`status` is `null`). Fix: mirror `skills-manager.js` — `!== null ? status : 1`.

### Out of scope — deferred (tracked in `tasks.md`)

All other confirmed/plausible findings: core C1 (BOM), C3 (rename slug-clobber),
C4 (bullet-line loss), C6 (GFM table pipes); all editor E1–E7; mcp M1
(frontmatter injection), M3 (`crc32` engine floor), M4/M5 (workspace-scope
recursion + `sources::` path traversal — **security-relevant**), M7/M8 (guard
laxness). Each needs its own design and review.

## Delivery

One PR to `main` on branch `fix/integrity-audit-blockers`, green on
`npm run verify` + the three iNNfo test suites before merge. No behaviour
change for valid inputs; the two core fixes are additive guards.
