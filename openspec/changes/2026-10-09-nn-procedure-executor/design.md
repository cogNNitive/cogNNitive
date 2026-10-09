# Design: nn-procedure-executor

## Technical Approach

Text-only consolidation, no executor code. One owner skill (`nn-innfo`) holds the
canonical **procedure-execution protocol**; `nn`, `nn-sources` and every other
skill replace their duplicate prose with a one-line pointer. Separately, rename
`nn-trannsform` → `nn-sources` (ingestion + lineage only) and shrink it. Maps to
capability `procedure-execution` (new) and modifies `router-governance`,
`template-procedures-manifest-and-discovery`, `innfo-skill-menu`.

## Architecture Decisions

### D1 — Owner skill
| Option | Tradeoff | Decision |
|---|---|---|
| `nn-innfo` | Already owns §16 discovery + `list_blueprint_procedures` + menu `[x]`; models are the execution surface | **Yes** |
| `nn` | Router/front controller; must stay thin, only owns the `[p]` catalog + precedence | No |

**Choice**: `nn-innfo`. **Rationale**: procedures are declared in Level-3 models
(`## NN Procedure:`), and `nn-innfo` is the model-authoring skill. `nn` keeps only
its multi-scope catalog and precedence (existing §3), linking to the protocol.

### D2 — Protocol content (short; a protocol, not an engine)
New `nn-innfo` section "Procedure Execution Protocol" — six terse subsections:
1. **Trigger** — run when the user selects a discovered procedure or names one.
2. **Discovery** — precedence `model > blueprint > domain > workspace`; sources:
   bluepriNNt `procedures:` frontmatter, `## NN Procedure:` model sections, and
   `workspace/procedures/*_NN.md` (also MCP `list_blueprint_procedures`).
3. **Step order (FSM)** — read step `Work` elements; start = the step no other
   `next::` targets; follow `next::` to build the ordered list.
4. **Output routing** — write-once under `artifacts/`; append `## NN Procedures:`
   lineage entries via the existing provenance path.
5. **Delegation** — a step whose `tool` belongs to another skill loads that skill
   (e.g. CLI ingestion → `nn-sources`); do not inline another skill's commands.
6. **Adaptation** — capture deviations and offer to update the procedure spec.

### D3 — Link strategy (no restatement)
Non-owner skills keep a single sentence: *"Procedure execution follows the
canonical protocol in `nn-innfo` §Procedure Execution Protocol; do not restate
it."* Delete the duplicated FSM/catalog prose from `nn` §3 and `nn-sources` §6,
leaving only their local catalog/menu references.

### D4 — Rename surfaces (every one; no shims)
| Surface | Action |
|---|---|
| `skills/nn-trannsform/` (whole tree: SKILL.md, README.md, TESTING.md, package.json/-lock, scripts/, test/, tests/, examples/, citations.md) | `git mv` → `skills/nn-sources/` |
| `SKILL.md` frontmatter | `name`, `description` triggers, `# Skill:` heading, internal `nn-trannsform` mentions |
| `package.json`/lock | name `nn-trannsform-scripts` → `nn-sources-scripts`; description |
| `test/test.ps1` | name-assertion regex → `name: nn-sources` |
| `examples/workflows/*.md` | prose refs |
| `scripts/build-skill-shared-rules.mjs` + `.test.mjs` | `SKILL_SECTION_MAP` key |
| `scripts/build-trannsform-core-mirror.mjs`, `scripts/migrate-hash-citations.mjs` | output/require path constants (`skills/nn-trannsform/...`) |
| `manifest/source.yaml` | skill `name`/`path`/`description`; `workflows[transform].skill`. No version pins exist, nothing to sync |
| `.github/workflows/{ci,release}.yml` | `npm ci --prefix skills/nn-...` |
| `.gitignore` | `skills/nn-trannsform/config.json` |
| `test/console-slug.test.mjs`, `test/feedback-validators-parity.test.mjs` | require path / label strings |
| `openspec/config.yaml` | context line, `per_package` test command, integration tool path |
| `docs/skills/documentation/README.md`, `_sidebar.md`, `llms.txt`, `ai-index.yaml` | **regenerated** (`build:docs` → `generate-docs-facts`/`generate-docsify-suite`); do not hand-edit |
| `docs/skills/documentation/documentation_NN.md` Page block; `skills/nn-trannsform.md` → `nn-sources.md` | hand-authored model + page (title/source/route/html_url) |
| landing twins `docs/skills/{index.md,llms.txt,llms-full.txt,ai-index.yaml,sitemap.xml,.well-known/ai-catalog.json}` | hand-fixed (not generated per archive note) |
| docs prose/`method:` | `docs/innfo/documentation/*`, `docs/research/*`, `docs/use/manifest-next.md`, `docs/cognitive_nn/use-cases/**/sources/nn/*.md` |
| `.agents/skills/nn-dev-check-integrity`, `nn-dev-release` | prose refs |
| installed copies | delete `~/.agents/skills/nn-trannsform` (+ `~/.claude/skills/...`) and reinstall `nn-sources`; document the reinstall |

Keep `trannsformPrimitives.ts` / `build-trannsform-core-mirror.mjs` **names**
(they name the core primitive, not the skill); only their skill-facing paths
change. Living spec dir `nn-trannsform-lineage-checks` is a stable capability
identifier — leave it; update only misleading prose via the delta merge.

### D5 — Shrink `/nn-sources`
Drop: the §3a "[a] iNNfo V_0-1-0 template" option, the `[b]` Markdown template
menu, and the `--apply`/`traNNsformations/`/`transformer.js` path (overlaps
blueprint procedures). Keep CLI: `--scan`, `--cognitivize`, `--normalize-file`,
`--import-url`, `--scan-external`, `--watch-digest`, `--curate-csv`, `--converge`,
`--gc`, `--unlink`, `--lineage`, `--check-impact`, `--promote-conv`; keep local
converters (mammoth/pdf-parse/xlsx). Section 6 (Execution) is deleted → link.

### D6 — Self-containment + versions
Each edited SKILL.md bumps its own `version:` (authored, then `sync-versions`
propagates). `manifest/source.yaml` has no skill version pins, so only
name/path/description change. Generated shared-rules and docs-catalog regions are
rebuilt, never hand-edited.

### D7 — Slice plan
1. **Protocol consolidation** (text): add protocol to `nn-innfo`; dedupe `nn`,
   `nn-sources` §6. Verify: manual read + `node scripts/verify.js`.
2. **Rename** (`git mv` + all surfaces in D4). Verify: `node scripts/verify.js`,
   `node scripts/build-skill-shared-rules.mjs --check`,
   `node scripts/generate-docs-facts.mjs --check`, `npm --prefix skills/nn-sources test`,
   stale-name grep guard.
3. **Shrink `/nn-sources`** (D5). Verify: grep guard that no `--apply`/
   `traNNsformations`/`[a] iNNfo template` reference remains in the skill or docs.
Strict TDD applies only to the existing assertions that encode the name
(`test.ps1`, `build-skill-shared-rules.test.mjs`, docs page-set) — update them
RED-first; the rest is Markdown/refactor.

### D8 — Collision warning
`session/qw-skills-cleanups` edits `skills/nn-trannsform/README.md` and
`TESTING.md`. Before landing, re-sync `dev`, and re-apply that branch's cleanup
onto the renamed `skills/nn-sources/README.md`/`TESTING.md`; a straight merge
would resurrect the old path. Confirm `git log --all -- skills/nn-trannsform/README.md`
is clean of unmerged edits.

## Data Flow

    user ─► nn [p] catalog ─┬─► nn-innfo protocol ─► discovery ─► FSM steps ─► artifacts/
                            └─► nn-sources CLI (ingestion/lineage only)
    discovery sources: bluepriNNt procedures: · ## NN Procedure: · workspace/procedures/*_NN.md

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/nn-innfo/SKILL.md` | Modify | Add protocol; bump version |
| `skills/nn/SKILL.md` | Modify | Dedupe §3 → pointer; bump version |
| `skills/nn-sources/SKILL.md` | Rename+Modify | `git mv`; drop §6/§3a/`--apply`; bump version |
| `manifest/source.yaml`, `scripts/*`, `.github/*`, `.gitignore`, `test/*`, `openspec/config.yaml` | Modify | Rename surfaces (D4) |
| `docs/skills/**`, `docs/use/manifest-next.md`, docs prose | Regenerate/Modify | Rename surfaces (D4) |
| installed `~/.agents/skills/nn-sources` | Reinstall | Documented manual step |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | name assertion, shared-rules map, docs page-set | existing node suites, RED-first |
| Integration | verify.js (mirror drift, ledger, docs facts), `npm --prefix skills/nn-sources test` | run after each slice |
| E2E | none (text/refactor) | — |

## Migration / Rollout

No data migration. Rollout = three commits (slices D7). Rollback = revert the
slice commit; the protocol addition is additive text, the rename is one commit.

## Open Questions

- [ ] Confirm the landing twins (`docs/skills/{index,llms*,ai-index,sitemap,.well-known}`)
  are hand-maintained and must be edited by hand (archive note says not generated).
- [ ] Whether `openspec/config.yaml` is regenerated by the pipeline or hand-edited.
