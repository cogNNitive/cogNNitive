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

---

## 6. `feature/import-source-history-check` — consult conversation history before importing a source from `sources/import/`

**Type:** functional

**Why:** When a file from `sources/import/` is about to be ingested as a source
(scan/normalize via `nn-trannsform`, `node scripts/index.js --scan`), the user
may have already handled the *same* or a *similar* document in a past
conversation — importing it again can duplicate work, repeat mistakes, or
ignore decisions that were already made. Today the pipeline imports blindly
with no memory of prior related work.

**Behaviour (as requested):** before incorporating the imported file as a
source, review the source history of past conversations (`conversations/`,
and the promoted transcripts/summaries in `sources/conversations/`) for
anything similar already done:

1. **Find** — search the conversation history for prior handling of the same /
   similar source (e.g. by `source_file`/`source_url`, filename, topic,
   normalized `sha256`, or content overlap).
2. **Summarise** — if a match is found, present a summary of what happened in
   that conversation, and the decisions that were taken.
3. **Ask** — ask the user how to proceed:
   - **reuse** — apply the same approach / decisions as before,
   - **adjust** — reuse but change something,
   - **from scratch** — proceed fresh, ignoring prior context.
4. If no match is found, proceed with the normal import without prompting.

**Approach (open):** this is a research/UX seam more than a pure pipeline
change. Likely touches the agent workflow layer (skill orchestration in
`actioNN`) rather than `innfo-core`, and/or a helper that indexes conversation
source history. Whether matching is deterministic (exact `sha256`/`source_url`)
or semantic (topic/LLM) is an open design decision — explore before proposing.

**Also consider:** tie into the lineage record (`# NN Sources` / `# NN
Procedures`) which already tracks what was ingested and when, to establish the
"what have we done before" baseline without inventing a parallel store.

---

## 7. `feature/duplicate-source-detection` — detect duplicate / updated sources on import

**Type:** functional

**Why:** during an import from `sources/import/`, another file may already
exist whose content is *exactly the same* (identical `sha256`) or *the same
content with a different organisation* (reordered sections, different format,
restructured but same substance). Importing blindly either duplicates the
source or loses the fact that the file is a newer version of an existing one.

**Behaviour (as requested):**
1. **Detect** — before normalising an incoming source, compare it against
   already-ingested sources (`sources/nn/` and existing entries in
   `sources/import/`):
   - **exact duplicate** — identical content (same `sha256`),
   - **near-duplicate** — same content but differently organised (structural
     comparison; exact heuristic is an open design decision).
2. **Ask** — if a match is found, ask the user whether this is an **update** of
   the existing source (same base content plus new content added).
3. **Act** — if the user confirms it is an update, offer to **create the new
   source and archive the old one**; otherwise keep the previous behaviour
   (treat as a new source) or skip, per the user's choice.

**Approach (open):** exact matches already have a cheap signal — the scanner
computes `sha256` per file (`scanner-core.js` `computeFileHash` /
`generateSourceFrontmatter`) and change detection is already hash-based, so an
exact-dup check is low effort. The near-duplicate / "same content, different
organisation" case needs a structural similarity heuristic (token/section
overlap, canonicalised whitespace+ordering) and is the exploratory part.
"Archive" semantics (move to a legacy/archive location vs. delete vs. keep as
`archived` marker in the lineage record) need a decision too.

**Also consider:** fits alongside item #6 (`import-source-history-check`) — both
are import-time "has this been done before?" guards; #6 looks at conversation
history, #7 looks at the file corpus. Design them together to avoid duplicating
matching logic.

---

## 8. `feat/local-specialization-migration` — migrate local `*_spec_NN.md` specializations onto new canonical templates

**Deferred from `2026-09-06-workspace-template-upgrade-flow`** (in scope there only as
`unlisted` detection + guidance).

**Why:** the workspace upgrade flow repoints `parent_spec` for models pinned to
**canonical** templates. A user-authored specialization (`<Model>_<Template>_V_x-y-z_spec_NN.md`,
`level: 2`, pointed to by the model's `parent_spec.url`) is a *local* schema — the canonical
repo evolution does not apply directly, and an upgrade is a **semantic rebase**: the
specialization's Concepts/Fields/Matrices/Markers must be re-derived on top of the new
canonical template, preserving the user's extensions while absorbing the upstream schema
changes.

**Current behavior to extend:** `upgrade-check.js` classifies these models `unlisted`
("template not in catalog"); `nn-upgrade` reports them and does not migrate.

**Approach (proposal, not final):**
1. Detect specializations: models whose `parent_spec.url` is a local `_spec_NN.md` path /
   non-canonical URL → resolve the *base* template name they specialize.
2. Three-way diff: (old base schema, new base schema, specialization delta). The user's
   delta = specialization minus old base; migration = (new base) + re-applied delta.
3. Conflict pass per definition: added/renamed/re-typed base definitions that collide with
   a specialization extension → mapping question; otherwise re-derive automatically.
4. Result: a new specialization file version (`V_x-y-z+1`) pointing `parent_spec` to the
   new canonical base, and models repointed to it.

**Risks / open decisions:** collision semantics when the base *adopts* something the
specialization already defined (dedupe vs error); whether to require the base template
identity (`includes`) to be preserved; versioning of the specialization (patch per rebase);
and whether `innfo-core` needs a real `diffTemplates(old, new)` primitive instead of the
agent-side diff.

**Size:** medium-high — touches `innfo-core` or a new deterministic diff helper, the
detection classification, and the `nn-upgrade` Phase 3/4 logic. Not a silent
auto-migration; consent + backup + re-validation gates from the parent change still apply.

**Suggested trigger:** `/sdd-explore local-specialization-migration` when the workspace
upgrade flow ships.
