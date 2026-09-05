# Proposal: Migrate Canonical Spec Hosting to the Monorepo

## Intent

`github.com/cogNNitive/iNNfo` was archived (read-only) in the 2026-09-03 consolidation, but it is still the canonical host in every spec's `spec_url` / `parent` / `parent_spec` frontmatter, in docs, in the editor runtime, in skill docs, and in the CI URL checker. Consequences today:

- New specs (`iNNfo_V_0-2-1`, already adopted as L1) can never be published at the URL they declare.
- Every model in the wild resolves its parent against a repo nobody can write to.
- The monorepo already serves identical content at `.../cogNNitive/cogNNitive/main/iNNfo/specs/...` (HTTP 200), so we have two live bases and no enforcement — pure drift risk.

**Why now**: the consolidation is half-done. Old URLs still 200, so nothing is on fire — which is exactly why this silently rots if not closed.

## Constraints (locked — do not reopen)

1. **Migrate every spec-hosting reference**, including frozen files (`iNNfo_V_0-1-0_NN.md`, `iNNfo_V_0-2-0_NN.md`, `defiNNe_V_0-1-0_NN.md`, all `_V_0-1-0_` templates). New base: `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/`. Blob links → `github.com/cogNNitive/cogNNitive/blob/main/iNNfo/<path>`. Abandoned `v0.1.x` tag pins collapse to `main`.
2. **CI enforcement is strict and repo-wide**: re-root `iNNfo/scripts/check-spec-version.mjs` to the repo root, widen extensions to `.ts .vue .md .mjs .js .yaml .yml .json .html`, keep `archive/` + `node_modules/` + `dist/` + `*.bundle.js` skips, and fail on ANY residual `cogNNitive/iNNfo` (raw host, `github.com` slug, or bare slug). No dual-base allowance. Preserve local file-existence checking (capture group = path after `.../main/iNNfo/`). `--inventory` untouched (always exit 0).
3. **`manifest/source.yaml` + mirrors + tooling tests are out of scope and MUST be allowlisted** in the strict checker (see Out of Scope).

### Accepted tradeoff: R-SV-02 byte-immutability set aside

`spec-versioning` R-SV-02 says published spec files must not be edited in place. We deliberately override it for this host migration: the consolidation already rewrote a NOTE callout URL inside `iNNfo_V_0-2-0_NN.md`, so partial immutability is already gone, and a mixed-host spec tree is worse than a uniform one. Only the host/org/branch/path-prefix segment changes — no `spec_version`, `V_x-y-z` token, or filename is touched.

## Scope

### In Scope

| Group | What changes |
|---|---|
| Canonical frontmatter | L1 + defiNNe specs, all L2 template specs, L3 samples, doc-procedure sub-models, `master.html`, docs-tree `*_NN.md`, actioNN/skill template + model copies, root `specs/**` (buckets A1–A9) |
| Editor runtime | `config/samples.ts`, `ModelInfoPanel.vue`, `StandaloneProcedureView.vue`, `ai-guide/procedure_NN.md` — plus a shared `REMOTE_SPEC_BASE` const next to `REMOTE_SAMPLE_BASE` (L1 URL is currently copy-pasted in 3 places) |
| Docs prose | `docs/specifications.md`, `docs/innfo/documentation/{specifications,citations-provenance}.md`, `docs/innfo/template-package-spec.md`, `docs/innfo/repair-guide.md` |
| Skill / repo docs | `actioNN/skills/nn-innfo/SKILL.md`, `nn-trannsform/scripts/lib/provenance-model.js`, `.agents/skills/nn-template-audit/SKILL.md`, `iNNfo/.agents/skills/nn-dev-spec-version-propagator/SKILL.md`, `iNNfo/packages/innfo-mcp/README.md`, `actioNN/AGENTS.md`, `iNNfo/CONTRIBUTING.md` |
| Active spec | `openspec/specs/submodel-conformance-validation/spec.md` L65 (`target_template::` example) |
| Checker rework | Re-root + widen + strict legacy scan + usage comment |
| Folded-in doc staleness | `iNNfo_V_0-2-1` as adopted L1 (`docs/innfo/documentation/specifications.md`, `docs/specifications.md`, `docs/innfo/template-package-spec.md`); nn-innfo `V_0-1-0` → `V_0-1-2` (`docs/actionn/documentation/README.md`, `.../skills/nn-innfo.md`); mcp bundle `v0.2.1` → `v0.2.4` (`docs/innfo/mcp-setup.md`); wrong org `github.com/iNNfo/iNNfo` → `cogNNitive/cogNNitive`; UTF-8 mojibake in `docs/innfo/changesets/{format-repo,innfo-repo}.md` |

### Out of Scope (follow-ups)

- **`migrate-release-manifest` — REQUIRED, the other half of the consolidation.** `manifest/source.yaml` uses `repo: cogNNitive/iNNfo` as a GitHub-API slug with tags (`templates-v0.2.0`, `innfo-mcp-v0.2.4`) that exist only on the archived repo; `validate-manifest.js` (CI `verify`) resolves them over the API and would go red if migrated here. Follow-up must: create the tags on `cogNNitive/cogNNitive`, rewrite the bootstrap manifest + `docs/use/manifest{,-next}.md`, rework `validate-manifest.js` and `scripts/manifest/*.test.js` + `actioNN/scripts/skills-manager.test.js`. **Known debt until then; allowlisted in the strict checker.**
- `docs/innfo/app/starter/*.md` — hand-authored, stale pre-consolidation layout (missing `iNNfo/` prefix); spec pre-population silently no-ops on their 404s.
- `docs/innfo/cdn/innfo-mcp-v0.2.1.bundle.js` — orphaned stale bundle.
- Root `specs/**` (6 files) — migrated here for hygiene, but appears unconsumed by any CI path; flag as a deletion candidate.
- Byte-exact parser fixtures, `openspec/changes/archive/**`, `temp/**`, `dist/**` — permanently excluded.

## Capabilities

### New Capabilities
- `canonical-spec-hosting`: the single canonical base URL for all iNNfo specs/templates/samples, the rewrite rules for legacy references, and the strict repo-wide CI guard that forbids residual `cogNNitive/iNNfo` references (with a documented allowlist).

### Modified Capabilities
- `submodel-conformance-validation`: the `target_template::` example URL in its scenario moves to the new canonical base (example-only; no behavioral requirement changes).

## Approach

Mechanical base find-replace per bucket (one occurrence per line, no other bytes touched), then the checker rework, then the editor `REMOTE_SPEC_BASE` extraction, then the folded-in doc fixes. Order matters: **the strict legacy scan must land with the migration**, because retargeting the regex alone is a vacuous green (the old pattern would simply match nothing).

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vacuous-green checker (regex retargeted, no strict scan) | High if unguarded | Strict legacy scan is a required deliverable; verify by asserting it fails on a seeded legacy URL |
| CRLF creep — ~90 `.md` files edited on Windows vs `.gitattributes` `*.md text eol=lf` | Medium | Review `git diff --stat` for whole-file rewrites; enforce LF before commit |
| `manifest/` allowlist too broad → hides real drift | Medium | Allowlist exact paths, not globs; `migrate-release-manifest` removes it |
| `ModelInfoPanel.vue` dynamic `${formatVersion}` URL is `${`-skipped by the checker | Medium | Human review + editor component test |
| Working tree is dirty (another session's `innfo-core` edits, a live worktree, 2 other openspec changes) | High | Fresh branch off `main`; stage only owned files; never `git add -A` |
| Frozen-spec edits trip a future R-SV-02 audit | Low | Tradeoff documented here and in the delta spec |

## Rollback Plan

Single squashable PR on a dedicated branch — `git revert` the merge commit restores every URL and the old checker. Old raw URLs still return 200 on the archived repo, so a revert is behaviorally inert for consumers. Nothing is published, tagged, or deployed beyond `deploy-pages` re-rendering docs.

## Dependencies

- None blocking. `migrate-release-manifest` is a downstream follow-up, not a prerequisite.

## Delivery / PR-Size Assessment

~70–95 files, but almost entirely one-line mechanical string edits plus one checker rewrite and one small editor refactor. Raw changed lines will exceed the 400-line review budget; per-file review cost is near zero and the diff is verifiable by the new CI gate itself. **Recommendation: single PR with `size:exception`**, rationale = mechanical find-replace with machine enforcement. Chaining would split an atomic invariant (a partial migration leaves a mixed-host tree that the strict checker would red-flag anyway).

## Success Criteria

- [ ] Zero `cogNNitive/iNNfo` references outside the documented allowlist and permanent exclusions.
- [ ] `check:spec-urls` fails on a deliberately seeded legacy URL and passes on the migrated tree.
- [ ] `check:spec-version -- --inventory` output is byte-identical to pre-change.
- [ ] `verify`, `quality`, `spec-integrity` all green; `build:docs` succeeds.
- [ ] Docs state `iNNfo_V_0-2-1` as adopted L1, nn-innfo `V_0-1-2`, mcp bundle `v0.2.4`.
- [ ] `migrate-release-manifest` is filed as a follow-up change.
- [ ] Diff contains no CRLF-only or whole-file rewrites.

## Proposal question round

Not asked interactively (sub-agent context). These remain open for user review — none blocks `sdd-spec` / `sdd-design`:

1. **Rewrite discipline**: should the migration be executed by a scripted codemod committed to the repo (repeatable, reviewable as one script) or by direct edits? Affects reviewability and whether `migrate-release-manifest` can reuse it.
2. **Allowlist visibility**: should the checker's `manifest/**` allowlist emit a loud WARNING line ("known debt — see `migrate-release-manifest`") on every run, or stay silent?
3. **Root `specs/**`**: migrate now and delete later, or delete in this PR? Deleting now removes 6 files from the diff and one migration surface, at the cost of mixing a deletion into a mechanical change.
