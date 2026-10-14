# Handoff — Console unification (spine) + changeset/lineage arc, and S3 (domain console parity gate)

**Audience:** the next AI agent session (and the maintainer reviewing it).
**Author:** the S3a session (`session/s3-domain-console`, worktree
`D:\Users\lucas\Documents\GitHub\cogNNitive-s3-domain-console`).
**Date:** 2026-10-14.
**Written in English** (repo artifact convention; the maintainer conversation may be in Spanish).

---

## 0. Read this first

- **The work we are doing** is the transition from the Vue `innfo-editor` + a
  `cognnitive.com/innfo/app/` hosted app to the **single domain console**
  (`domaiNN_console.html`), with **changesets as the only change mechanism**. It is
  tracked as the "console unification (spine) + changeset/lineage" arc.
- **The authoritative plan is** `openspec/changes/2026-10-13-DEPENDENCIES.md`. Read it
  before touching anything. It defines apply order, authority, requirement-overlap
  resolutions, releases and the maintainer-resolved decisions (its "Decisions 1–13").
- **The current change is** `openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/`
  (S3). Its **S3a** is applied; **S3b is not planned yet** and is gated on a maintainer
  review of `audit.md`.
- **Nothing in this arc is landed on `dev` from this session.** The S3a work lives on the
  session branch and is pushed; land it after the review (§7).
- **Where to look:** landed changes are under `openspec/changes/archive/`; the living
  specs are under `openspec/specs/`; the console source is
  `iNNfo/specs/bluepriNNts/console/`; the Vue editor being retired is
  `iNNfo/apps/innfo-editor/`.

---

## 1. The arc at a glance

### 1.1 Two change sets, reconciled on 2026-10-13

`DEPENDENCIES.md` reconciles two sets authored in parallel:

- **`single-console-shell` (SCS) — the console spine.** One shell
  (`artifact_shell.html`, runtime `InnfoConsole`); every console is the domain console,
  optionally scoped. Retires the model/procedures/custom console types,
  `model_console.html`, `render-model-viewer.js`, the `compile_model_console` procedure
  and the `build_console_payload` MCP tool.
- **The lineage set (#1A, #1B, #1C, S2c, S3, S4, S5, S6).** Changeset as a first-class L3
  node, immutability, console Changes view, provenance retirement, domain-console ports,
  migration-flow retirement, editor retirement, console regeneration/propose.

**Authority (do not re-litigate):**
- **SCS is authoritative for console architecture** — no model/procedures/custom consoles;
  a lineage delta that asserts the old multi-console model is re-cut.
- **The lineage set is authoritative for changeset / identity / provenance.**

### 1.2 Ordering

```
blueprint-external-skills (ARCHIVE FIRST — shares template-* deltas)

SCS  single-console-shell ──────────────── SPINE
        │
        └─► #1A ──► #1B ──► #1C ──► S2c ──► S3a ──► S3b ─┬─► S5 (S5a→S5d)
                                        │                 │
                                        │            ┌────┘
                                        └─► S6 (S6a→S6e)
                                    S4 (S4-1→S4-2) ──► S6c   (parallel with S3)
```

### 1.3 What has landed (archived) vs what remains (active)

| Change | Status | Files | Key evidence |
|---|---|---|---|
| `domain-console-views` | **landed** (archived 2026-10-10) | `archive/2026-10-10-2026-10-09-domain-console-views/` | view registry, D14 single artifact, hub retirement; `blueprints-v0.25.0` |
| `single-console-shell` (SCS) | **landed** (archived 2026-10-13) | `archive/2026-10-13-single-console-shell/` | spine; feat `f1ad92f6`, release `5dd5e603` (`innfo-console-v0.10.0`, `innfo-mcp-v0.17.0`), archive `958db679` |
| `blueprint-external-skills` | **landed** (archived 2026-10-14) | `archive/2026-10-14-2026-10-10-blueprint-external-skills/` | archive `c34dc76e` (this session) |
| `changeset-first-class-and-lineage` (#1A) | **landed** (archived) | `archive/2026-10-13-2026-10-13-changeset-first-class-and-lineage/` | feat `5d32a5b1`, archive `b1e06bbc` |
| `changeset-immutability-and-snapshot-removal` (#1B) | **landed** (archived) | `archive/2026-10-13-2026-10-13-changeset-immutability-and-snapshot-removal/` | feat `a6e2ab6d`, archive `b1e06bbc` |
| `console-changes-view-and-slug-ids` (#1C) | **landed** (archived) | `archive/2026-10-13-2026-10-13-console-changes-view-and-slug-ids/` | feats `352eb213`/`4529e273`/`6e4b4013`, release `3cda1379` (`blueprints-v0.31.0`, `innfo-console-v0.11.0`, `innfo-mcp-v0.18.0`, `skills-v2.19.0`) |
| `s2c-retire-legacy-provenance` (S2c) | **landed** (archived 2026-10-14) | `archive/2026-10-14-2026-10-13-s2c-retire-legacy-provenance/` | groups `4216c95b`→`98e1d4c3`, release+archive `b8cd1cd5` (`innfo-console-v0.12.0`, `innfo-mcp-v0.19.0`, `skills-v2.20.0`, `blueprints-v0.32.0`) |
| **S3** `domain-console-and-edit-modal` | **active — S3a applied, S3b not planned** | `changes/2026-10-13-s3-domain-console-and-edit-modal/` | this session (§5) |
| **S4** `retire-legacy-migration-flows` | **active — not started** (0/15) | `changes/2026-10-13-s4-retire-legacy-migration-flows/` | blocks S6c |
| **S6** `console-regeneration-and-propose` | **active — not started** (0/51) | `changes/2026-10-13-s6-console-regeneration-and-propose/` | S6c needs S4 |
| **S5** `retire-innfo-editor` | **active — not started** (0/29) | `changes/2026-10-13-s5-retire-innfo-editor/` | blocked on S3 **and** S6 |
| `nn-quarantine-removal` | **active — BLOCKED** (0/7) | `changes/2026-09-30-nn-quarantine-removal/` | task 1.1 = maintainer sign-off |
| `nn-domain-git-workflow`, `video-script-contract-additions` | active, independent | `changes/…` | not part of this arc |

> **Checkbox caveat (important).** For `single-console-shell` (9 unticked boxes),
> `#1A`/`#1B` (all unticked), and `blueprint-external-skills` (all unticked), the boxes
> were **never ticked but the work landed** — verified by their feature/release/archive
> commits and by the living specs. Do **not** infer "pending" from `[ ]` in those
> archived changes. `#1C`, S2c and `domain-console-views` are fully checked.

### 1.4 Releases cut so far (tag-driven; pins never hand-edited)

`blueprints-v0.25.0` (2026-10-10) · SCS: `innfo-console-v0.10.0`, `innfo-mcp-v0.17.0`
(2026-10-13) · #1A–#1C: `blueprints-v0.31.0`, `innfo-console-v0.11.0`, `innfo-mcp-v0.18.0`,
`skills-v2.19.0` (2026-10-13) · S2c: `innfo-console-v0.12.0`, `innfo-mcp-v0.19.0`,
`skills-v2.20.0`, `blueprints-v0.32.0` (2026-10-14). Release keys:
`skills|blueprints|innfo-mcp|innfo-console` (`scripts/release/release-keys.js`).

---

## 2. What each landed slice delivered (with the decisions behind it)

### 2.1 `single-console-shell` (SCS) — the spine

- **S1 runtime parity (additive):** identity header (`renderNavbarIdentity` — title,
  template, version, generated stamp); working `#el-<id>` deep links (open card + switch
  concept); `safeSourceHref` allowlist for `meta.sourceUrl`; header-level source citation
  icons; per-model `sha256` / `citationsResolvedAt` in `meta.models`; scoped draft
  `domainId`.
- **S2 scoped export:** removed the per-model export loop; a selection (`<Model>`,
  `--filter`, `--all`, `--stale`) narrows the model set and sets
  `meta.consoleScope = {view?, models?, label}`; write-once members under
  `artifacts/<scope>_console/`; `--status`/`--stale` redefined over `meta.models[].sha256`;
  `--domain` + a selection is an error (exit 2).
- **S3 re-point:** `console-review-env.ts` + ~15 suites moved to `artifact_shell.html`;
  `loadConsole` returns `{UI, Review, Console}`; viewer-only suites deleted.
- **S4 deletions:** `model_console.html`, `render-model-viewer.js`,
  `compile_model_console_NN.md`, the two procedures consoles, `build_console_payload`
  (tool/spec/server wiring), `console-golden-parity.test.ts`; bundle sources, guards and
  docs updated.
- **Decisions (SCS `design.md` D1–D10):** models-scope needs zero render branching (the
  payload is already narrowed); `sourceUrl` is runtime-supported only and has **no
  producer** (kept dormant); `business/spec_NN.md` and `canonical-registry.ts` are
  deliberately **not** hand-edited (changelog history).
- **Risks handled:** identity/deep-links lost silently (mitigated by doing S1 before S4);
  re-pointed suites passing vacuously (**each must be proven go-red → this is the
  mutation-check debt we closed in §5.2**); scoped export clobbering
  `domaiNN_console.html` (write-once + scope suffix).

### 2.2 #1A — changeset first-class + lineage

- Changesets are valid iNNfo **Level-3 documents** (`level: 3`,
  `parent_spec: {name,url}`), required by a strict parser (no default frontmatter).
- `Change.sources` is an **evidence citation** parsed/typed/serialized/sealed with the
  proposal (`PROPOSAL_KEYS`); apply resolves every citation at intake and rejects with
  `CITATION_UNRESOLVED` (all-or-nothing; never rewrites `sources::`).
- Raw-text-preserving `serializeChangeset` (normative lines byte-identical; only
  execution-annotation lines + execution frontmatter keys change) — this is what makes
  #1B's immutability enforceable.
- `changeset` is a lineage node / citation target; the console changeset export emits L3
  + slug targets; the `nn-innfo` agent protocol mandates `sources::`.
- **Decisions:** drop `changeset_id`/`type: changeset`; `proposal_sha` optional; the
  **proposer** writes `sources`, apply only verifies.

### 2.3 #1B — immutability + snapshot removal

- Apply computes write-back bytes at end of Phase 1 and asserts every change block's
  **normative lines are byte-identical** to input, aborting with
  `PROPOSAL_IMMUTABILITY_VIOLATION` (nothing written, lock released); also guards the
  conflict path.
- `persistWithArchive` → `persistAtomic` (tmp+rename; no archive dir); the dead
  `kNNowledge/archive/` snapshot is gone.
- A D20 field rewrite records the replaced citation in the change's `replaced_sources::`;
  `history.ts` exposes `replaced_sources`.
- **Decisions:** immutability = normative bytes never change; execution facts live in
  frontmatter + per-change annotations; no trailing outcome section (the parser would
  absorb it); copy-free atomic persist.

### 2.4 #1C — console changes view + slug ids

- `element.id = frozen slug`; an unfrozen model ⇒ `UNFROZEN_MODEL` (no derived ids);
  domain ids are `<model>@<element_slug>` (the **D5 address**).
- Domain meta carries `generated` + `models[]` with the real `knowledge_version`/`sha256`
  and **no** fake `domainVersion`.
- New `changes` collection in the payload + a `readonly` **Changes view**
  (`console-view-changes.js`, proposed first).
- Draft store keyed by domain id only; per-draft `base_hash` staleness; a store-version
  bump discards old drafts (intended, not a migration).
- Modal tab renamed "Lineage" (sections History / Citations, per-field "Origin").
- **Decisions:** slug ids with no fallback; the id-format change is not "internal"
  (goldens and browser drafts depend on it); repo domains' slugs frozen (write-once
  samples recorded in `iNNfo/validation-baseline.json`).

### 2.5 S2c — retire legacy provenance

- Verdict badges re-pointed to `element.history` + the domain `changes` collection;
  citation origin derived from the cited change's `author` (agent/human); `origin:
  reviewer` removed.
- Deleted: the console feedback JSON export + `feedback.schema.json`; the
  `feedback-ledger.jsonl` engine and `meta.feedbackState`; the two feedback MCP tools +
  `reconcile_feedback`; the `nn-sources` feedback ingestion + orphan `change-log.js`; the
  `agentModification.ts` block builder. A grep guard
  (`test/no-legacy-provenance.test.mjs`) was added.
- **Decisions/justification:** the ledger could go because `record_feedback_verdict` was
  its only writer and was never applied by `apply_change`. Reviewer verdicts
  `pending`/`rejected`/`stale` disappear — a proposal is now reviewed by **applying it or
  not**. User data is never deleted (it lives in sha-checked Sources). The console
  DOM-id rename `feedback-export` → `changeset-export` was delegated to the spine, not
  repeated here.

### 2.6 `domain-console-views` (the D14 confirmation slice)

- S0 deleted the orphan iframe console; S1 runtime fixes (Matrices tab panel, live draft
  count, export filename from the model slug); S2 the **view registry** (`registerView`,
  tabs from the registry, lazy mount, hash routing, error notice), a shared mount context
  (`ctx.store/modal/changeset`, sandboxed `readonly` iframes with CSP), the exporter lib
  `scripts/console-views.mjs` (one file for `--domain`), the **size budget**
  (warn 5 MB / fail 15 MB), standalone `--view`, a sample custom view, and Timeline +
  Procedure migrated to views with their shells deleted; S3 retired the Workspace Hub.
- **Decisions:** D14 single-artifact model; custom views are **trusted** (no sandbox) but
  listed in the artifact header; `readonly` views may use a sandboxed `iframe srcdoc`
  with no store access; editable views must NOT use iframes; convention-over-config for
  `consoles/views/<slug>.js`; `--view` exports a single view + a scoped changeset.

### 2.7 `blueprint-external-skills`

- A bluepriNNt may **recommend** pinned, integrity-verified third-party skills
  (reproducible + unmodified + license-declared) without cogNNitive vouching for the
  author. Extended `TemplateSkill` with `commit`/`ref`/`sha256`/`license`/`distribution`;
  pure `skill-tree-digest`; `external-skill-policy` validator wired into
  `check-integrity`/`check:versions`; consent-gated `install-external` with digest
  verification before the atomic swap; docs state the two tiers (`embedded` curated vs
  `referenced` bounded).
- **Decisions:** reference + install-time fetch (not vendored, not runtime); commit SHA
  locator + sha256 tree digest trust anchor; `install-external` only (consent); SPDX
  license, `vendored` requires a redistributable allowlist; failure is loud, never a
  silent skip. **Deliberate deviation from `strict_tdd`** (maintainer-approved): only 3
  load-bearing tests, mechanical edits get none.

---

## 3. Maintainer-resolved decisions that still govern the arc (from `DEPENDENCIES.md` §Decisions)

1. Document badge → `https://cognnitive.com/innfo/` (S5 wording).
2. CTAs → "Open App" → "Read the docs" → `https://cognnitive.com/innfo/documentation/`.
3. Write-once samples recorded in `iNNfo/validation-baseline.json` (not excluded).
4. Reference grammar stays exact `[[Display Name]]` + ambiguity error; a slug-only grammar
   is **not** opened now (would be a separate versioned iNNfo change).
5. Console identifiers renamed in SCS: need `feedback-export` → `changeset-export`;
   `#innfo-feedback-*` → `#innfo-changeset-*`; `[data-innfo-feedback-root]` →
   `[data-innfo-changeset-root]`. **S2c records the rename and does not repeat it.**
6. Legacy detection kept (S4); removed later by the blocked `nn-quarantine-removal`.
7. `apply_change` keeps resolving a target by slug or exact name.
8. **Bare `apply_change` ops** (`bump_version`, `generate_index`, `add_concept`,
   `add_field`, `set_marker`, `freeze_slugs`) stay for now; a **follow-up change** must
   route or remove them (they currently bypass changesets).
9. **S3a kept, narrowed:** re-audit the editor against the **already-unified** console (the
   safety gate before S5 deletes the editor); do **not** re-audit what SCS ported.
10. Lineage deltas touching an SCS capability are re-cut against post-SCS text and dropped
    when redundant.
11. Verdict source + stable console file resolved: S2c owns the badges; the **stable console
    file is S6's**.
12. `nn-upgrade-contract-docs` folded into S4 and removed as a live change.
13. `init_knowledge` repair half dropped: `init_knowledge` becomes create-only; broken
    frontmatter handled by `validate_knowledge` + `update_field` (S6).

---

## 4. Pending decisions **the maintainer must make** (flagged, not resolved)

### 4.1 `audit.md` — the S3a gate (task **1.2**, OPEN)

`openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/audit.md` is written and
committed, with a `Maintainer review: PENDING` banner. It classifies every editor
`.vue`/route: **93 rows = 46 *in console* / 4 *port* / 43 *drop***.

**Rows flagged for confirmation (the 4 *port* rows + one *in console* dispute):**

| Row | Proposed | Question for the maintainer |
|---|---|---|
| `GraphViewer.vue` + `components/editor/lineageChain.ts` (Decision 1 — workspace lineage graph) | **port** as a `readonly` view | Port the workspace graph view, or record an explicit **drop**? The console Model Map partly overlaps; **S5 must not claim the console supersedes the workspace graph** unless it is ported. |
| `FilePreviewModal.vue` (Decision 2) | **port** | Confirm the port scope: original-file action, Preview/Code/Lineage modes, unit-pointed opens. |
| `ValidationReport.vue` (Decision 7) | **port** as a `readonly` view | Port a read-only validation view, or delegate to the agent (`validate_model`) and record **drop**? |
| `SearchResultsView.vue` / `Header.vue` (Decision 3) | **in console** via full-text search | The console has **no tag AND-filter**; is full-text search acceptable, or does the tag filter become a **port**? |
| `LeftSidebar.vue` / `ConceptTreeNode.vue` (Decision 4) | **in console** (concept rail); the dual-mode/breadcrumb/submodel-nesting chrome **drop** | Confirm dropping submodel nesting (the console lists models flat). |

Already **resolved as drop** by design and recorded (no question): model/submodel
creation (Decision 5 — agent changesets + console "New element"), workspace
presets/deep links (Decision 6), template-freshness warnings (Decision 7).

### 4.2 D14 "source index" interpretation (needs confirmation)

For the S3a D14 remainder ("the console embeds every model, the precomputed history and
the **source index**; heavy sources are linked, not embedded; the size budget gates"),
this session **interpreted** "source index" as the **already-embedded payload**:

- every model → `meta.models[]`;
- per-element history → `el.history`;
- **source index** → `el.citations` (per field) + `meta.sources` (the live specs
  `console-field-citations` and `console-payload-builder`);
- **heavy source linked, not embedded** → the citation **excerpt cap of 500 chars**
  (`EXCERPT_CHAR_CAP` in `innfo-core/src/console/citations.ts`);
- size budget → `evaluateSizeBudget` (`scripts/console-views.mjs`; warn 5 MB / fail 15 MB).

Under this reading **task 2.2 was a no-op** — `scripts/export-console.mjs` needed no
change; the new tests prove the existing behaviour.

**Open question:** confirm this reading, or commission a **new domain-level source
index** (a catalogue of sources with byte size and an `embedded|linked` flag + an
explicit embed threshold + runtime rendering). The latter is a scope extension to S3a.

---

## 5. What **this session** changed (S3a + two pending minors)

All commits are on `session/s3-domain-console` (pushed to `origin`). `main`/`dev` were
**not** touched.

| Commit | Unit | What / why |
|---|---|---|
| `1e6c496e` | D17 vocabulary | `iNNfo/specs/vocabulary.json`: canonical **`console`** term; **`editor`** and **`hosted app`** added to `retired_identifiers` as `ui_term` → `console` (the `bluepriNNt` `app` alias untouched). Guard assertions added to `iNNfo/specs/scripts/test-vocabulary.js` (61/61). `docs/innfo/documentation/vocabulary.md` regenerated with `node scripts/generate-vocabulary-doc.mjs` (never hand-edited). |
| `e15a7f65` | D14 tests | New block in `test/console-export.test.mjs`: every model embedded; per-element history from changesets; the `el.citations`/`meta.sources` source index; a source above the excerpt threshold is truncated (linked, not embedded) and its full body is never in the HTML; an oversized export fails the size budget and writes no artifact. Suite 34/34. |
| `18c36af3` | S3a audit | `audit.md` (93 rows; seven explicit decisions; D14 check; 1.2 left open). |
| `c34dc76e` | minor | Archived `2026-10-10-blueprint-external-skills` (as `2026-10-14-…`), reconciling its deltas (see §6.4). |
| `31694294` | minor | Re-exported the TestLab domain console `test/fixtures/testlab/domaiNN_console.html` (it was stale: missing the S2c Changes view, carrying the old fabricated domain version). |
| `3780f5b8`, `b9527d9d` | S3a tasks | Checked off 1.1, 2.1, 2.2, 3.1, 3.2, 5.1. |
| `cc6e8e01` | minor | Recorded the console-suite mutation checks at `openspec/changes/archive/2026-10-13-single-console-shell/apply-progress-s3.md`. |

### 5.1 `audit.md` method and why it is shaped this way

- One row per `.vue` file and per route (86 + 3), plus 4 feature-bearing `.ts` rows.
- Decision is exactly **in console / port / drop**; **evidence of real use** is a test
  under `iNNfo/apps/innfo-editor/tests/**` or a doc under `docs/innfo/documentation/*.md`;
  **no evidence ⇒ drop** (the design's rule).
- The seven explicit decisions are each documented in a dedicated section, with the
  justification and the console-today comparison.
- The audit is a **draft for the maintainer** — the 4 port rows are the proposed S3b
  scope. Task 4.1 (re-plan S3b) must not start until 1.2 closes.

### 5.2 Mutation checks (pending minor from the archived `single-console-shell`)

The live spec `innfo-console-runtime` requires every re-pointed/rewritten console suite
to be "demonstrably able to fail". This session performed and recorded **18** mutation
checks (13 `console-review-env` suites + `console-feedback-ui` + `console-thinning` +
`console-shell` + `test/console-element-card.test.mjs` + `naming/console-model.test.ts`):
each baseline GREEN → one targeted mutation → RED (recorded) → exact revert → GREEN. The
other 7 `naming/*` suites have no console relation (recorded as such). Record:
`openspec/changes/archive/2026-10-13-single-console-shell/apply-progress-s3.md`.

### 5.3 Verification

`node scripts/verify.js` → **green (159/159)**. (See §6.2 for the two environmental
failures that must be cleared first.)

---

## 6. Conventions, gotchas and traps for the next session

### 6.1 Session isolation (mandatory)

Follow `.agents/skills/nn-dev-development/SKILL.md`: start a session worktree
(`node scripts/nn-session.mjs start --id <id>`), commit early, never write to the primary
checkout. Branch `session/<id>`; land on `dev` via PR or a fast-forward. The session
worktree from this work is
`D:\Users\lucas\Documents\GitHub\cogNNitive-s3-domain-console` (branch
`session/s3-domain-console`, pushed) — it is alive and safe to continue in, or to
`nn-session.mjs stop` once merged.

### 6.2 `verify.js` needs built dist

`npm ci` (done by `nn-session start`) does **not** build the workspace packages. Before
`node scripts/verify.js`, build:

```powershell
npm --workspace=@cognnitive/innfo-core run build
npm --workspace=@cognnitive/innfo-mcp  run build
```

Without them, the `Docs-Derived Facts Drift Guard` (needs `innfo-mcp/dist/server.js`) and
the `migrate-domain.test.js` (needs `innfo-core/dist/index.js`) fail. These are
**environmental**, not batch failures.

### 6.3 Known noise

`skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` regenerates as noise (esbuild
writes absolute paths). **Never stage it.** Revert with:
`cmd /c "git show HEAD:<path> > <path>"` (the hook blocks `git checkout HEAD -- <path>`).

### 6.4 OpenSpec archive gotchas (learned this session)

- `openspec` is a **global CLI (v1.2.0)**; `openspec archive <id> -y`. It ABORTS if a
  capability would end with 0 requirements and leaves an empty live spec (delete that spec
  by hand).
- **Validation checks only the first text line** of a requirement body for SHALL/MUST. A
  requirement beginning "A bluepriNNt MAY …" fails even if a later line says MUST — rewrap
  so the first line contains MUST/SHALL.
- A delta under `## MODIFIED Requirements` whose requirement **name is absent from the
  live spec** aborts the archive ("MODIFIED failed for header … not found"); a brand-new
  requirement must be under `## ADDED Requirements`, and the name must match the live
  spec exactly (a stray `R-TPD-04: ` prefix did not match).
- The change's `proposal.md` should have `## Why` / `## What Changes` (warning only).

### 6.5 Never hand-edit derived artifacts

Regenerate, never edit: the console bundle
(`node scripts/build-console-bundle.mjs`), shells
(`node scripts/build-console-shells.mjs`), the console-payload mirror
(`node scripts/build-console-payload.mjs`), MCP bundles, and docs facts
(`node scripts/generate-docs-facts.mjs`); the vocabulary doc is generated by
`node scripts/generate-vocabulary-doc.mjs`.

### 6.6 Tags

Tag-driven releases. If a `push:tags` event is dropped, dispatch the fallback
`gh workflow run release.yml --ref main -f tag=<tag> -f publish=true`, **one at a time**
(the `release` concurrency group cancels if dispatched together). Release freeze: no
session may push `dev`/`main` while a tag's workflow concludes.

---

## 7. What remains to do (in order)

1. **Maintainer review of `audit.md` (S3 1.2)** — decide the 4 port rows and the 5 flags
   (§4.1), and confirm the D14 source-index interpretation (§4.2). Then record the outcome
   + date at the top of `audit.md` and check 1.2.
2. **Re-plan S3b (S3 4.1)** — from the reviewed audit, write one delta requirement per
   *port* row and a batch-sized task group per port (tests first) into the S3 change. If
   the audit has no port rows, S3b is empty and **S3 archives after S3a**.
3. **Apply S3b** (strict_tdd) — ports compose the `InnfoUI` primitives, the single shared
   modal for editable components, and `registerView` (`kind: readonly`) for read-only
   views. **No second UI stack.**
4. **S4** (`2026-10-13-s4-retire-legacy-migration-flows`) — delete the in-place migration
   flows; land before S6c (both edit `migrate-domain.js`).
5. **S6** (`2026-10-13-s6-console-regeneration-and-propose`) — preview-as-a-file, agent
   propose, `add_model`, stable console filenames, console regeneration. S6c needs S4.
6. **S5** (`2026-10-13-s5-retire-innfo-editor`) — delete the Vue editor/app/live-preview;
   blocked on S3 complete **and** S6 complete.
7. **`nn-quarantine-removal`** — only after S4 → S6 → S5, and only with the maintainer's
   written sign-off (task 1.1).
8. **Follow-up (from decision 8):** route or remove the bare `apply_change` ops that still
   bypass changesets.

### Safe ordering note

`S4 → S6 → S5 → nn-quarantine-removal` is the safe order (they share
`legacy-ledger.yaml` and `migrate-domain.js` touch-points).

---

## 8. Exact state of the repo right now

- Primary checkout: `dev` @ `52debbeb` (2 commits ahead of `origin/main` @ `b8cd1cd5`:
  the nn-dev skills slim). Pending batch `origin/main..origin/dev` = 2 commits.
- This session's worktree: `session/s3-domain-console` @ `b9527d9d` + the handoff commit,
  pushed to `origin`, clean.
- `openspec/` active changes: S3, S4, S5, S6, `nn-quarantine-removal`, `nn-domain-git-workflow`,
  `video-script-contract-additions`.
- `origin/main` is the last release (S2c batch, `b8cd1cd5`); S3a is **not** on `main` or
  `dev` yet.

### Files this session created or changed (for review)

- `openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/audit.md` (new; needs review)
- `openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/tasks.md` (checkboxes)
- `test/console-export.test.mjs` (new D14 tests)
- `iNNfo/specs/vocabulary.json`, `iNNfo/specs/scripts/test-vocabulary.js`,
  `docs/innfo/documentation/vocabulary.md`
- `test/fixtures/testlab/domaiNN_console.html` (re-exported)
- `openspec/changes/archive/2026-10-13-single-console-shell/apply-progress-s3.md` (new)
- `openspec/changes/archive/2026-10-14-2026-10-10-blueprint-external-skills/**` (archive)
- `openspec/specs/{blueprint-external-skills,template-package-structure,template-procedures-manifest-and-discovery}/spec.md` (archive reconciliation)

---

## 9. Related memory (Engram, project `cognnitive`)

Saved this session: "S3a applied: parity audit + D14/D17"; "OpenSpec archive gotchas:
delta validation + MODIFIED mismatch"; "single-console-shell S3.2/S3.3 mutation checks
recorded". Search Engram for `s3-domain-console-and-edit-modal`,
`openspec/archive-gotchas`, `innfo-console-runtime-mutation-checks` for the full text.
