# Tasks: Video Template Architecture (Script Skill, Workspace/Subject/Series/Video Hierarchy, Placeholder Templates, Folder Contract)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,300–1,600 (13 new files in `skills/nn-video-script/`, 3 new sample files, 4 modified template/manifest files, plus generated catalog/manifest diffs) |
| Estimated file count | ~17 new, ~6 modified, plus auto-generated catalog/manifest output |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (mapped to sequenced work-unit commits — this repo has no per-change PR flow; see `nn-dev-development`) |
| Suggested split | Work Unit 1 → Work Unit 2 → Work Unit 3 (see below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — orchestrator decision required |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

**Suggested work units** (commits on `dev`, not PRs):

| Unit | Goal | Batches | Notes |
|------|------|---------|-------|
| 1 | Skill spike + implementation, fully tested, no template/manifest coupling yet | Batch 1, Batch 2 | Independently revertable; touches only `skills/nn-video-script/` |
| 2 | Video template prose, procedure rewrite, sample series-kit | Batch 3 | Depends on Unit 1's skill name/paths existing |
| 3 | Release sequence: manifest entry, check-parity extension, editor/catalog sync, freeze, repin, `dev`→`main` | Batch 4 | Must land as one atomic sequence per `nn-dev-release`; cannot itself be split once the freeze step starts |

Orchestrator: decide whether Units 1–2 land as separate `dev` commits before Unit 3, or whether risk tolerance allows a single larger commit. This decision is intentionally left open here per `ask-on-risk`.

## Scope Caveats (not tasks)

- `renders/` and `.anydeo/` living inside Element-owned video folders are out of scope beyond gitignore patterns (`video-folder-contract` / `workspace-directory-conventions` — "Ephemeral Engine Directories"). No task addresses editor media-scanner noise from these directories.
- `video-folder-contract`'s and `workspace-directory-conventions`' example path `series/{series-slug}/videos/{video-slug}/` is illustrative; `video-folder-contract` explicitly allows segment names to be refined during implementation as long as three-level scoping and the containment rule hold. Design AD3 finalizes the video-scoped segment as `series/<s>/assets/<video-slug>/` (because `{modelDir}` resolution is unchanged). Batch 3 tasks use the AD3 path; no task is needed to reconcile the illustrative spec wording.
- Series is implemented as a Level-3 model of the **existing** `video` template (reused, not a new template) per design AD1. This satisfies the `video-production-hierarchy` requirement that Series "MUST NOT require an iNNfo Concept/Field Definition block, `template_version`, or a spec pin" — no new template, template_version axis, or spec pin is introduced for Series itself. Task language below says "reuses the existing video template," never "creates a lightweight registry."

## Batch 1: Pre-Flight Spikes (blocking — run before any dependent task)

- [x] 1.1 Spike: confirm the `ScriptParser` API shape and `npx tsx` availability by running `tsx` against `$VIDGENN_ROOT/packages/core/src/index.ts` and inspecting the exported `ScriptParser` (constructor, parse method, issue-reporting shape). Record findings for use in 2.7. (Design: Open Questions/Risks #1; feeds `video-script-skill`.)
  - **Finding (2026-09-26):** `ScriptParser` (from `parser/Parser.js`, re-exported by `index.ts`) is a class with a single **static** method: `ScriptParser.parse(content: string, title?: string, styleDictionary?: any): { project: Project, issues: Issue[] }`. No constructor is used. Each `issue` has `{ severity: 'error'|'warning'|'pending', line, path?, context?, message, details? }`. `npx tsx` (v4.23.15, already installed) successfully imports the TS entry point via a dynamic `import(pathToFileURL(...).href)` — VidGeNN's own `package.json` already uses the identical `npx tsx scripts/spec-audit.ts` pattern, confirming this is an established convention in that repo. Windows gotcha: a raw `D:/...` string passed to `import()` throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`; it must go through `pathToFileURL(...).href` first. A script with a header, one scene, plain narration, and one `@@` layer with a Markdown `![](...)` asset reference parses with zero issues — that fixture is reused as the "valid sample script" for 2.6/2.7.
- [x] 1.2 Spike: build a throwaway `<Name>_V_x-y-z_video_NN.md` fixture with an added `series:` frontmatter block and run innfo-core's model validator against it to confirm it tolerates the custom block. (Design: Open Questions/Risks #2; `video-production-hierarchy` — Series Represented as Lightweight Registry.)
  - **Finding (2026-09-26):** Built a throwaway Level-3 `video` model fixture with a `series: { slug, procedure, script_template, assets }` frontmatter block and validated it with innfo-core's real `validateDocument`/`parseModel` (`iNNfo/packages/innfo-core/dist/index.js`) against the actual `iNNfo/specs/templates/video/spec_NN.md` template. Result: `valid: true`, zero errors. `checkFrontmatterInvariants` (`iNNfo/packages/innfo-core/src/validator/model-checks.ts`) only inspects known keys (`level`, `parent_spec`, `model_version`, and the Level-3 schema-components ban); `parseFrontmatter` (`iNNfo/packages/innfo-core/src/parser/yaml.ts`) does a loose YAML parse with no `.strict()`/schema rejection of unknown top-level keys. The two warnings produced were unrelated to `series:` (an `# NN index`-ignored notice and a file-naming convention notice from the throwaway filename).
- [x] 1.3 Decision gate on 1.2's result:
  - If the validator tolerates `series:` frontmatter → proceed with AD1 exactly as designed (inline frontmatter on the Level-3 `video` model). No further action.
  - If it does NOT tolerate it → switch to design's stated fallback: a sibling `series_NN.md` sidecar file holding the Series metadata instead of inline frontmatter. Update Batch 3 tasks 3.1 and 3.2 accordingly before continuing. Record the decision and rationale inline in this file.
  - **Decision (2026-09-26): the validator tolerates `series:` frontmatter (see 1.2 finding above) → proceeding with AD1 exactly as designed.** Inline `series:` frontmatter on the Level-3 `video` model, no sidecar fallback. Batch 3 tasks 3.1/3.2 need no adjustment — they can be implemented exactly as written when that work unit is picked up.

## Batch 2: Skill Implementation — `skills/nn-video-script/` (Strict TDD; depends on Batch 1)

- [x] 2.1 RED — write `skills/nn-video-script/test/check-script.test.mjs`: leaked `{{slot}}` (regex `/\{\{[^{}]*\}\}/g`), leftover `<!-- slot:` comment, wrong/missing first-line header `//ANYDEO_SPEC: <pinned>`, asset path escape vs. an allowed `../../shared/...` path. (`series-script-templates` — Zero-Unresolved-Placeholder Gate; `video-folder-contract` — No-Upward-Escape Rule.)
- [x] 2.2 GREEN — implement `skills/nn-video-script/scripts/check-script.mjs` running checks in order: `{{…}}` leak → leftover slot comment → header line → asset escape; exit 1 with `line:col` findings on first failure category.
- [x] 2.3 REFACTOR — extract shared line-scan/regex helpers in `check-script.mjs` if 2.2 duplicated logic across checks.
  - **Note:** the four checks already shared one `lineColAt(content, index)` helper from the first GREEN pass; no further duplication was found to extract.
- [x] 2.4 RED — write `skills/nn-video-script/test/finalize-video.test.mjs` using temp dirs: single ref succeeds, ambiguous ref with no `--ref` fails, existing thumbnail is preserved unless `--force-thumbnail`, missing voiceover file is skipped without error. (`video-folder-contract` — Finalize/Register Step Promotes Rendered Output.)
- [x] 2.5 GREEN — implement `skills/nn-video-script/scripts/finalize-video.mjs` per design Data Flow: pick `renders/<ref>/`, copy `master`/`thumbnail`/`voiceover` via temp-file-then-rename, print the field values to set; never move or edit the model file.
- [x] 2.6 RED — write `skills/nn-video-script/test/vus-parse.test.mjs`, gated on `VIDGENN_ROOT` (explicit skip line when unset, per `preflight-tests-leak-real-home-dir` lesson — never probe default paths), asserting zero issues on a valid sample script.
- [x] 2.7 GREEN — implement `skills/nn-video-script/scripts/vus-parse.mjs` using the 1.1 spike findings: resolve `$VIDGENN_ROOT/packages/core/src/index.ts`, invoke `ScriptParser` via the confirmed API/`tsx` invocation, require 0 issues.
  - **Note:** the actual TS import happens in a small child helper (`scripts/vus-parse-runner.mjs`) spawned via `npx tsx`, since `vus-parse.mjs` itself runs under plain `node` (matching how `verify.js` invokes every `*.test.mjs` suite). Verified GREEN twice: once with `VIDGENN_ROOT` unset (explicit `SKIP:` line, exit 0) and once with `VIDGENN_ROOT` pointed at the real VidGeNN checkout (real `ScriptParser.parse` call, zero issues on the 1.1 fixture).
- [x] 2.8 Implement `skills/nn-video-script/scripts/vus-spec.mjs`: resolve `$VIDGENN_ROOT/packages/core/specs/<v>.json`, verify the pinned sha256, expose `voices` and `props <scope>` queries. (`video-script-skill` — No-Prose-Copy of VUS Syntax Facts.)
  - **Note:** the pin is read from this skill's own `SKILL.md` frontmatter (`vus_spec.version` / `vus_spec.sha256`), so the pin has exactly one home. Manually verified against the real VidGeNN checkout: `node scripts/vus-spec.mjs voices` and `props scene` both return live pinned-spec data with a matching hash; `VIDGENN_ROOT` unset prints the same `SKIP:` convention as `vus-parse.mjs`.
- [x] 2.9 Author `skills/nn-video-script/SKILL.md`, forked from VidGeNN's `anydeo-script-builder`, `nn-` prefixed: workflow and rules only, no voice IDs or property tables in prose, frontmatter `version: "V_0-1-0"` and `vus_spec: {version: "V_0-3-3", sha256: <pinned>}`, `spec_version` removed. (`video-script-skill` — Forked Skill With One-Way Dependency.)
  - **Note:** pinned sha256 is `72630624f8fb35e6ca6124249663f4e58c2f4772474ed2162007a09eb2013642`, computed from the canonical `VidGeNN/packages/core/specs/V_0-3-3.json` (BOM-stripped, CRLF→LF), confirmed to differ in size from the stale `.agent/skills/anydeo-script-builder/specs/V_0-3-3.json` copy the spec explicitly forbids pinning to.
- [x] 2.10 Author `skills/nn-video-script/references/vus-authoring-notes.md`: header-line convention, `![](…)` preferred over `layer_asset_source`, `auto_media` quirks documented from iNNtrevistas.
- [x] 2.11 Author `skills/nn-video-script/references/series-template-convention.md`: `{{slot}}` + `<!-- slot: … -->` instruction-comment convention; series-wide rules document shape. (`series-script-templates` — `{{slot}}` Placeholder Convention; Inline Fill-In Instructions Per Slot; Series-Wide Rules Document.)
- [x] 2.12 Author `skills/nn-video-script/references/folder-contract.md`: three-level asset scoping, no-upward-escape rule, ephemeral `renders/`/`.anydeo/` directories, finalize/register step. (`video-folder-contract` — all four requirements.)

**Work Unit 1 status: COMPLETE (2026-09-26).** All of Batch 1 and Batch 2 implemented, tested, and verified — `node scripts/verify.js` passes, including auto-discovery of the three new `skills/nn-video-script/test/*.test.mjs` suites.

## Batch 3: Video Template & Hierarchy Documentation (depends on Batch 1 decision, Batch 2 skill name/paths)

- [x] 3.1 Update `iNNfo/specs/templates/video/spec_NN.md` prose: document the Workspace → Subject → Series → Video hierarchy (D2); Series as a Level-3 model that **reuses the existing `video` template** (AD1) rather than a new template; Subject bound via `sources::` (AD2); unchanged `{modelDir}/assets/{slug}/` resolution (AD3); the D4 folder contract and no-upward-escape rule. Bump frontmatter `template_version: V_0-2-1 → V_0-3-0`; leave `spec_version` and the manifest `version:` untouched (two separate version axes). (`video-production-hierarchy` — Four-Level Hierarchy; `video-folder-contract` — Three-Level Asset Scoping.)
- [x] 3.2 Rewrite `iNNfo/specs/templates/video/procedures/generate_anydeo_script_NN.md`: Frame (Subject + Series, stage workspace assets into `shared/`) → Author from `script_template.md` → Validate (`check-script.mjs` then `vus-parse.mjs`) → Register script (`script::`, status `scripting`) → Render (user-driven, VidGeNN) → Finalize (`finalize-video.mjs`) → Register assets (`master`/`thumbnail`/`voiceover`, status `rendering`). Replace every `anydeo-script-builder` reference with `skills/nn-video-script`. (`series-script-templates` — Zero-Unresolved-Placeholder Gate; `video-folder-contract` — Finalize/Register Step.)
- [x] 3.3 Add `iNNfo/specs/templates/video/samples/series-kit/script_template.md` and `.../series-kit/series_rules.md` demonstrating the `{{slot}}` + inline-instruction convention and a series-wide rules document.
- [x] 3.4 Spot-check: confirm the existing Ghostbusters sample model needs no changes under AD3 (verification only, no edit expected).
- [x] 3.5 Cross-check that 3.1/3.2 folder-path prose is consistent with the `workspace-directory-conventions` delta's `series/{series-slug}/` layout, using the AD3-refined `assets/<video-slug>/` segment name (see Scope Caveats above — not a spec conflict, just wording consistency).

**Work Unit 2 status: COMPLETE (2026-09-26).** Video template documentation, procedure rewrite, and sample series-kit implemented, verified, and committed on `dev` (commit `739e6c2`).

## Batch 4: Release Sequence (Migration/Rollout — strict order; do not interleave unrelated work once started)

- [x] 4.1 Checkpoint: confirm Batch 2 (skill) and Batch 3 (template prose, procedure, samples) are committed on `dev` as the content-commit step.
- [x] 4.2 RED — extend `scripts/manifest/check-parity.test.js` with cases: `external_specs` version/sha256 mismatch fails, path outside `^packages/core/specs/V_\d+-\d+-\d+\.json$` (e.g. `.agent/skills/...`) is rejected, `VIDGENN_ROOT` unset prints an explicit skip line and does not probe default paths. Clear `VIDGENN_ROOT` in test setup.
- [x] 4.3 GREEN — extend `scripts/manifest/check-parity.js` to run, per `skills[].external_specs[]`: (a) version/sha256 must equal SKILL.md `vus_spec`; (b) path must match `^packages/core/specs/V_\d+-\d+-\d+\.json$`; (c) basename must equal `${version}.json`; (d) only if `VIDGENN_ROOT` is set, compare local file hash (BOM-stripped, CRLF→LF) and check `info.version` matches.
- [x] 4.4 Add the `nn-video-script` skill entry to `manifest/source.yaml` with the nested `external_specs` `vus` block (`repo: innV0/VidGeNN`, `path: packages/core/specs/V_0-3-3.json`, `version: "V_0-3-3"`, computed LF-normalized `sha256`), same batch as 4.2/4.3.
- [x] 4.5 Bump `SHIPPED_TEMPLATE_VERSIONS.video` to `V_0-3-0` in `innfo-editor/src/config/samples.ts`, same batch.
- [x] 4.6 Run `template-catalog.mjs` and `sync-versions.mjs`; commit any generated diffs, same batch.
- [x] 4.7 Freeze: after the last `spec_NN.md` edit (3.1), cut `templates-v0.14.0` and `skills-v2.2.0` tags on a `main`-reachable commit (`checkTemplateMainCoherence` byte-compares against these tags).
- [x] 4.8 Repin: update `channels.stable` refs and run `generate-manifest.js --check` to regenerate/validate the stable manifest doc.
- [x] 4.9 Fast-forward `dev` → `main` as one batch (per `nn-dev-release`), then run `verify --release`.
- [x] 4.10 Run `node scripts/verify.js` (auto-discovers `skills/nn-video-script/test/*.test.mjs` and the extended `check-parity.test.js` via `collectTestSuites`) and confirm the integration test (2.6/2.7) reports its explicit skip line when `VIDGENN_ROOT` is unset in this environment.

**Work Unit 3 status: COMPLETE (2026-09-26).** All release sequence steps executed, tags `skills-v2.2.0` and `templates-v0.14.0` published, stable manifest regenerated and validated (`verify.js --release` green), and merged cleanly to `main`.
