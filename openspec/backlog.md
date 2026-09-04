# Backlog

Prioritized follow-up work. Each item is ready to start with `/sdd-new <slug>`
(or `/sdd-explore <slug>` first when the approach is still open).

Source: whole-monorepo code audit (2026-09-04). The audit's F1–F10 findings and
the `bump_version` backup-abort fix shipped in PRs #1–#14; the items below were
deliberately deferred at that time.

---

## 1. `refactor/split-types` — split `innfo-core/src/types.ts` (F11)

**Why:** `types.ts` is 493 lines and openly mixes two domains — a comment at
line ~366 marks "Graph / App Model Types (moved from apps/innfo-editor)". Parser
/ model types and the editor's graph-node model share one file, so every
consumer pulls the whole surface.

**Approach:** make `types.ts` a barrel that `export *`s from `types/parser.ts`,
`types/validation.ts`, `types/io.ts`, `types/graph.ts`. All ~25 internal
`from './types'` / `from '../types'` imports and the `export * from './types'`
in `index.ts` / `browser.ts` keep working unchanged. Cross-module references
(`ModelNode` → `FieldValue` / `ValidationError` / `TaxonomyEdge`) become
explicit imports.

**Size:** ~1 file → 5 files, no behaviour change. Low risk (barrel), but an
exacting move — do it in a focused pass, not tacked onto other work.

**Also consider:** the `SpecFrontmatter` `[key: string]: unknown` index
signature weakens every property access on that interface; decide whether it is
still needed for pass-through frontmatter.

---

## 2. `chore/editor-any-ratchet` — drive down `any` in innfo-editor (F15)

**Why:** ~96 `as any` + ~77 `: any` in the editor's non-test source. The ESLint
config already tracks this as a documented "ratchet backlog"
(`@typescript-eslint/no-explicit-any: warn`), but nothing forces the count
down, and CI only started running lint in PR #1.

**Approach:** incremental, not one PR. Each cast removal can surface a real gap
— e.g. `(fm as any)?.parent_spec?.version` in `ModelDashboard.vue` reads a field
`ParentRef` does not declare, so removing the cast forces a decision (add
`version?` to `ParentRef`, or change the call site).

**First slices (bounded, high-confidence):**
- The gratuitous `(fm as any)` / `(parseFrontmatter(...) as any)` casts where
  `parseFrontmatter` already returns a typed `SpecFrontmatter` — ~20 sites
  across `stores/`, `composables/`, `components/editor/`, `components/layout/`.
- `components/editor/composables/useGraphRenderer.ts` — 35 `any` in one file
  (d3 typing); a targeted pass with `@types/d3` generics.

**Guard:** add a lint rule / CI check that fails a PR which *raises* the count.

---

## 3. `fix/silent-fallbacks-sweep` — classify the remaining `catch` sites (F2, remainder)

**Why:** the README states "Fail-Fast: No silent fallbacks". PR #8 fixed the
`parseYaml` swallow and PR #9 fixed the dangerous `bump_version` backup swallow.
~35 `.catch(() => {})` / `catch { /* ignore */ }` sites remain across
`innfo-core` and `innfo-mcp` (concentrated in the split `innfo-mcp/src/tools/`
modules).

**Approach:** classify each into one of three buckets and make it explicit —
  1. **propagate** (parse errors, backup/IO failures that must abort),
  2. **log + continue** (`console.warn` with the path + error — genuinely
     optional side operations like the asset-dir rename or `index.md` update),
  3. **swallow deliberately** — only "file may legitimately not exist" reads,
     guarded with `err.code === 'ENOENT'` and a comment saying so.

**Size:** ~35 sites, medium risk (touches behaviour) — one reviewer pass, do
not batch with a refactor.

---

## 4. `chore/renormalize-line-endings` — one-time CRLF → LF (F18)

**Why:** the repo had mixed line endings; PR #1 added `.gitattributes`
(`* text=auto eol=lf`) which stops *new* drift but does not touch already-tracked
files.

**Approach:** `git add --renormalize .` on its own commit, nothing else in the
diff. Large but purely mechanical; land it when no other branch is open to
minimise rebase pain.

---

## 5. `ci/investigate-deploy-pages` — the Pages deploy job is slow / self-cancels

**Why (discovered during the audit merge):** `deploy-pages` in
`.github/workflows/ci.yml` regularly runs 12+ minutes and, because it holds the
`pages` concurrency group, a burst of merges leaves its runs stuck `pending` /
`cancelled`. The code gates (`verify` / `quality` / `spec-integrity`) are
unaffected and pass; `verify` already builds the docs. Pre-existing, not caused
by the audit work.

**Approach:** check whether `deploy-pages` needs `npm ci` at all (it rebuilds
what `verify` already built), consider `actions/upload-pages-artifact` from the
`verify` job's output, or split Pages deploy into its own workflow triggered
only on `main` after CI succeeds.
