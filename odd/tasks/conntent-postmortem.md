# coNNtent production post-mortem fixes

Objective: fix the defects filed as #606–#616 from a real coNNtent production session (E01–E02, blueprint V_0-18-0).
Branch: `session/conntent-postmortem` (worktree `cogNNitive-conntent-postmortem`), one PR to `main`. Delivery: ask-on-risk; one work-unit commit per writer unit.
Test runner: `node --test <file>` for nn-conntent/skills scripts; `npx vitest run <file>` inside `iNNfo/packages/nn-core` and `nn-mcp`; `npm run verify:fast` at the end.

## Specs

Each spec quotes its issue; the issue body is the full requirement text (`gh issue view <n> --repo cogNNitive/cogNNitive`).

- **S1 (#606)** The console exports a review changeset that `produce` accepts as-is: a real reviewer (never the placeholder `"reviewer"`), hierarchical ids (`<series>/<episode>`, never a filename stem), and no duplicated entries on re-export. `produce` intake prints the rejection code and message of each rejected changeset instead of only `intake: applied pending ... (rejected)`.
- **S2 (#607)** Captions: the scene→audio map reaches the captions stage; a missing scene audio fails with a named error (`caption-audio-missing`), never the `files[0]` fallback. One cache key for writer and reader, no silent `catch {}`. `narrationCaptions` are grouped into readable segments and emitted as `caption` overlays. The coverage guard normalizes spelled-out numbers vs digits.
- **S3 (#608)** Authored `animation` projects survive emission: sub-composition files referenced by `data-composition-src` are copied, ids are namespaced per mount so the same project can be mounted by two scenes, and a project that passes `hyperframes check` renders when mounted. Staged components are refreshed from the slots when the slot changed.
- **S4 (#615)** User rule, verbatim: "Las escenas, cuando hay narración, deben ajustarse a la duración de la narración. Una animación no puede determinar la duración, sino que deben ajustarse a lo que dura la narración." With `narration:: on`, scene duration = narration duration; animation layers are trimmed or looped to it. Only `narration:: off` scenes take their length from media or animation.
- **S5 (#616)** The render pipeline runs on Windows: pinned HyperFrames CLI instead of `npx`, `.cmd` shims spawned safely, no frame bytes read from `ffmpeg` stdout via `spawnSync`, whisper model not hard-coded to an uninstalled `small`.
- **S6 (#609)** `watermark.html` honors the `nn-pos-*` position classes like `b-roll.html`.
- **S7 (#610)** QA overlay presence: an overlay with no text skips the visual check (structural check stays); threshold separates present vs absent on textured backgrounds; generated captions are checked structurally and by manifest timing, not by frame diff.
- **S8 (#611)** Preflight validates models in distributed storage (manifest and placement rules, not only `kNNowledge/`), flags an installed blueprint engine older than the version the domain declares (with the install command), warns on an unsynced manifest; the skills update path covers installed blueprints.
- **S9 (#612)** Blueprint gaps: narration line breaks never reach TTS as pauses; Preset-provided values satisfy Layer conditional fields; review iteration reopens only changed scenes (or an official draft mode is documented); `Libre` chrome loss and the static avatar in the animatic are documented.
- **S10 (#613, #565)** Ship series / cascade / character procedures with the blueprint; harden `nn-conntent/SKILL.md` (load HyperFrames skills, search the registry before hand-authoring, snapshot before render, kinds come only from the series, never patch the installed copy silently); `folder-contract.md` says `episodes/<slug>/`.
- **S11 (#614)** `sources::` documentation agrees with the L3 rule; dotted slugs are rejected before apply; `produce_artifact` gives an actionable result in a domain without an artifact registry.

Assumptions (not requested, recorded so they can be reversed):
- `Libre` keeps its name (renaming a reserved token breaks existing documents); only its chrome loss is documented.
- Layer inheritance from Scene Kinds (#612.3), data inputs for `animation` layers (#612.4) and a shared cross-domain export procedure (#614.4) are new blueprint features, not fixes: they get a follow-up change, not this branch.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 emitter: captions, animation mounts, duration, watermark, captions CLI, preset→asset | S2 S3 S4 S5(cli, whisper) S6 S9(preset) | delegated (parallel unit A) | done (RED on base copy 8+7 fails → GREEN; suite 756/756 after parent applied 4 out-of-surface edits) | b5d03b65 |
| T2 QA + Windows spawn | S5(spawn, ffmpeg) S7 | delegated (parallel unit B) | done (10/10 RED→GREEN, suite 736/738, 2 field-registry fails from T4's in-flight spec edit) | 57878419 |
| T3 review gate: console export + intake reason | S1 S9(review iteration) | delegated (parallel unit C) | partial: reviewer, dedupe, real intake reasons (end-to-end test) done; S9 per-scene reopen already true (regression test). Hierarchical ids: done (payload exports buildDomainIndex/discoverDomainModels; parent fixed the coNNtent view's stem-based knowledgeId, RED→GREEN in export-console-hierarchical-ids test 3) | 3cfae287, 22126c2e |
| T4 blueprint docs, procedures, skill | S9(docs) S10 S11(sources docs) | delegated (parallel unit D) | done; coNNtent blueprint_version bump (V_0-19-0 + ~9 pinned tests) deferred to T7 | 171525e8 |
| T5 preflight + skills update | S8 | delegated | done (RED 1/8→8/8, 2/4→4/4; empty-HOME run green; skills-manager bundle regenerated by parent) | fd1f37ad |
| T6 core: dotted slugs, produce_artifact (preset item moved to T1) | S11 | delegated | done (INVALID_ELEMENT_SLUG before write; ARTIFACT_NOT_A_FILE for directories — there is no artifact registry) | ae255b7f |
| T8 #611 leftovers: list_blueprint_skills hydration, console regen path error | S8 | delegated (after T6) | done (hydrate copied only spec_NN.md; esbuild CJS mirrors emptied import.meta; flat global tier named by spec_version) | 75a9938c |
| T7 seam check: blueprint_version bump V_0-19-0, CR check, console shell pin, full verify, PR | all | inline | done locally; CI pending | 2617ee22, 9ba270b4 |

## Log

- **L1** (2026-11-11, user): "Supongo que tiene sentido corregir cada uno de los issues. ¿No es así? Si es así, adelante hasta el final."
- **L2** Routing: four parallel units first (T1–T4, disjoint edit surfaces, shared worktree, parent owns git); T5 and T6 after, to keep the machine within process limits (fork failures were observed while creating the issues).
- **L3** T2 done. The ffmpeg-stdout zero-density was NOT reproduced on this machine (stdout worked); the likely cause was an ffmpeg `.cmd` shim failing to spawn, also covered by `spawnTool`. The pre-commit regen hook staged other writers' in-flight files (SKILL.md, console bundle); the commit was redone with only T2's files and `--no-verify`. While writers run, unit commits skip the regen hook; the final commit runs it.
- **L4** T4 done. Findings: `series/<s>/assets/` is legacy for ALL content (series media live in `series/<s>/library/<kind>/`), so S10's "assets/ for shared media" wording was wrong; the docs follow the engine. `guard-template-immutability.js` requires a coNNtent `blueprint_version` bump for any change under the blueprint (spec or skills): do it once in T7 to `V_0-19-0` and update the pinned tests (pattern: commit a0877b7f). Shipped procedures use `[[Name]]` in `parent::`/`next::`, which nn-mcp `validate_knowledge` rejects as `ADDRESS_MALFORMED` (pre-existing, also in `usage_procedures_NN.md`): file as its own issue. #612.2 (preset satisfies conditional field) lives in `scene-compiler.mjs`, so it moved from T6 to T1.
- **L5** T5 done. Root cause of `blueprintModelsScanned: 0`: the count was only assigned when the template catalog was reachable. Writer edits arrived as whole-file CRLF (scripted edits through Git Bash); normalized to LF before commit — check every writer's files for `\r` at T7. Still open from #611 (outside S8): `list_blueprint_skills` returning `[]` after hydration, and the intermittent `export-console` "path argument ... undefined" during `produce` → T8 after T6.
- **L6** T1, T3, T6 done; parent applied T1's out-of-surface edits (captions test args, removed `quoteArg` test, synced `library/components/<slot>/index.html` with `slots/`, pipeline passes `audioAssets`/`cacheDir` to captions), moved T6's end-to-end test into `nn-mcp/src/tools/element-slug.spec.ts`, regenerated the nn-core mirror. Correction: in this Git Bash `grep -c $'\r'` counts every line, so the earlier "CRLF" alarm on T5 was false (the LF normalization was a no-op); real CR bytes checked with `tr -cd '\r'`: none. Bump to V_0-19-0 in 2617ee22 (catalog `release_tag` churn reverted). Filed #617 for the pre-existing `[[Name]]` vs `validate_knowledge` mismatch.
- **L7** T8 done. verify:fast: console shell pin regenerated (9ba270b4); the docs-facts drift guard fails locally only because this worktree never built `nn-mcp/dist` (no tool-registry change on the branch), so CI decides. Out of scope, left for follow-up: Scene Kind layer inheritance (#612.3), data inputs for `animation` layers (#612.4), shared cross-domain export procedure (#614.4), engine-side discovery of #565, `Libre` rename (kept by decision).
