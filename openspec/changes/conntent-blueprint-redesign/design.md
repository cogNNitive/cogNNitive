# Design: coNNtent bluepriNNt Redesign

## Technical Approach

The model stays as it is. What changes is the delivery chain around it, which is rebuilt as a small set of deep modules inside the engine (`skills/nn-conntent/scripts/lib/`). Each module owns one guarantee that today is spread across many files:

| Module | Owns | Replaces |
|---|---|---|
| `layout.mjs` | The one folder contract, and a rejection message for each legacy path | `LEGACY_EPISODE` skip (`export-console.mjs:228`), `modelIdOf` `assets` branch (`produce.mjs:105`), `EPISODE_DIRS=['episodes','assets']` (`console-view-episode-review.data.mjs:66`) |
| `library.mjs` | Lookup of logical names (episode `media/` → series `library/` → domaiNN `library/` → package `library/`) | `findNearest`/`findNearestByStem` (`video-scope.mjs:236-291`), the frame, component and sound walks (`compile.mjs:81,109,208`), `resolveSeriesTitle`/`resolveThumbnailFrameTokens` (`render-thumbnail.mjs:62,186`) |
| `cascade.mjs` | One resolver per scene/layer, with scope classes and a source trace | `resolve(param, bags)` called without scene/layer bags (`compile.mjs:465,531`, `asset-cost-estimator.mjs:178-181`), `resolveForEpisode` (`episode.mjs:129`) |
| `plan.mjs` (extended) | Building the plan once; plan slices per scene; `plan_hash`; persistence | The estimator's own re-lowering path (`asset-cost-estimator.mjs:147-370`) |
| `gates.mjs` | Gate state derived from applied `review_gate` changes and current hashes; re-open causes | `pendingReviews` on `review::` (`episode.mjs:141`), `script_review`, `--approve` |
| `review-hash.mjs` | Canonical review subjects and their hashes, shared by the engine and the console data module | — (new; prevents two hash implementations) |
| `captions.mjs` | whisper alignment through `hyperframes transcribe`, and its cache | — |
| `qa.mjs` | Post-render QA | The minimal QA from hotfix 0 |
| `delivery.mjs` | `deliveries/v<N>/`, the version rule, the link-or-copy fallback | — |
| `pipeline.mjs` | Stage order and stop points; console regeneration on every exit | The linear body of `produce()` (`produce.mjs:159-348`) |

Cross-blueprint seams stay generic. `review_gate` is an nn-core op that knows nothing about coNNtent. The console runtime gains CSP media, `consoleScope.models`, a direct write to `changes/`, and a `verdict` draft kind. Assumes hotfix 0 (`conntent-render-hotfix`) is merged (TTS before avatar, layers in the render, `language` passed to TTS).

## Verification of grounding facts

| # | Finding | Effect on the design |
|---|---|---|
| G1 | nn-core `_NN` invariant: a stem must equal or end with `<bp>` (`naming/contract.ts:349`). `instanceFileName(slug, bp)` gives `<slug>_coNNtent_NN.md` (`:77`). | The openspec names `<s>_series_NN.md` and `<slug>_coNNtent_<s>_NN.md` break the invariant. Both series and episode use `<slug>_coNNtent_NN.md` (D-S2). |
| G2 | `Video` uses `placement:: "{container}/assets/{slug}/"` (`spec_NN.md:53`), so nn-core's `add_model` creates episodes in `assets/`. | Slice 1 changes the placement to `{container}/episodes/{slug}/`. This is the real root cause of F3 and F5. |
| G3 | The engine reaches apply/propose through `scripts/core-mirrors/coNNtent.ts`, which re-exports nn-mcp's `executeChangesetApply` and `writeProposedChangeset`. | Agent refusal goes in the `propose_changeset` tool handler, not in `writeProposedChangeset` (the engine uses that writer). Human-origin validation goes in `executeChangesetApply`. The mirror is rebuilt. |
| G4 | The CSP is `default-src 'none'; img-src 'self' data: blob: … https:` with **no `media-src`**, so `<video>`/`<audio>` fall back to `'none'` (`artifact_shell.html:10`). | Add `media-src` and the `file:` scheme (D-C1). |
| G5 | The runtime already writes through the File System Access API (`showSaveFilePicker`, `nn-runtime.js:6834`), for snapshots only. | Reuse that seam for `showDirectoryPicker` (D-C2). |
| G6 | `consoleScopeOf` reads only `scope.view` (`nn-runtime.js:3613`). The spec narrows `models` at export time (`console-scope` spec). | The runtime part is small: label, draft-store key and read-only mode. The payload is narrowed in `writeConsole`. |
| G7 | The two ledgers are `video-guard.mjs:18` (`.cognnitive/video-ledger.jsonl`, written by `SpendGuard`) and `facts.mjs:17-18` (`.cognnitive/video/ledger.jsonl`, read by `produce`). | One path: `facts.mjs`. The ledger functions in `video-guard.mjs` are deleted. |
| G8 | `video-guard.json` carries the caps, allow/block lists, `maxAvatarConcurrency`, `maxAvatarSeconds`, `systemVoices` and `voices` (`video-guard.mjs:23-45`). | Each one gets a new home (D-S4). |
| G9 | `transcribe --json` gives `[{id,text,start,end}]`. It writes `assets/transcript.json` in the cwd and overwrites it. The default model translates. Whisper invents words over silence. Unspaced scripts come back as one "word" (`hyperframes/references/captions.md:5-10`). | Run it in a temp cwd per audio, drop silent-tail words, and refuse `captions: words` for unspaced languages (D-P3). |
| G10 | HyperFrames frame presets are **folders**: `FRAME.md`, `caption-skin.html`, `fonts/` (`assets/frame-presets/*`). `look.md:7` reads `frame.md` at the project root. | The frame is `library/frames/<name>/FRAME.md` (a folder), not `<name>.md` (D-K3). |
| G11 | `frame-tokens.mjs` uses its own YAML subset that cannot parse the nested `components:` maps (`:45-60`). | Use nn-core's frontmatter parser through the mirror. This avoids a third divergent parser (memory "Two frontmatter parsers diverge"). |

## Architecture Decisions

### Slice 1: Structure

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-S1 | Layout enforcement | `layout.mjs#assertLayout(root)` returns one `LAYOUT_LEGACY` error per legacy path: `series/*/assets/*/` holding `_coNNtent_NN.md`; root or series `sounds/`, `components/`, `frames/`; `video-guard.json`. It is called by `produce`, the console data module and the entry point. | An ignore-skip (today); a migration script | Premise: reject, never adapt. One module means one message per path. |
| D-S2 | Names | Series `series/<s>/<s>_coNNtent_NN.md` (`scope: true`). Episode `series/<s>/episodes/<slug>/<slug>_coNNtent_NN.md`. Hierarchical id `<s>/<slug>`. Master `<slug>_<W>x<H>.mp4`, `formats/<slug>_<W>x<H>.mp4`, `<slug>_thumbnail_<W>x<H>.png`, `<slug>_description.md`, `<slug>_animatic_<W>x<H>.mp4`; working files `plan.json`, `qa.json` (no slug). Composition id = slug. | openspec `<s>_series_NN.md` / `<slug>_coNNtent_<s>_NN.md` | G1: the nn-core invariant and `instanceFileName` decide. The series is recognised by `scope: true`, never by name. |
| D-S3 | Library lookup | `resolveLibrary({kind, ref, fromDir})`. `ref` is `[series:\|domain:]<kind>/<stem>`, and the match is any extension (folder kinds: `frames`, `components`, `characters`). `..`, absolute paths and `\` are rejected (`LIBRARY_PATH_INVALID`). It returns `{path, level, searched}`. The blueprint package `library/` is the floor. A miss at a user level → `MissingAssetError`. A miss at the floor → one warning (the D21 rule from `missing-asset.mjs` is kept). | Paths relative to the declaring document | One rule for every kind. The plan and the console print `level` + `path` (D2). F9's coincidental `../../` resolution cannot be written. |
| D-S4 | `video-guard.json` retired | Per-run cap → cascade `budget`. Daily cap → `daily_budget`. Blocked → `allowed:: false` on Model. `maxAvatarSeconds` and concurrency → new Model fields `max_seconds` and `max_concurrency`. `systemVoices` and `voices` → catalog `Voice` elements (reference catalog for provider-native voices, overlay for clones). `--allow-model` is deleted. | Keep the JSON alongside the catalog | One source per fact. Removing `budgetPerRunUsd`/`dailyCapUsd` falls out of this, and the rest of the budget collapse stays out of scope. |
| D-S5 | Plan file | `<episode>/plan.json` (aligned with the specs in the spec reconciliation; was `<slug>_plan.md`). It holds the stamp, the per-scene slices with their slice hashes, the episode `plan_hash` and the library resolution records. The engine never trusts its body and always recomputes. | `.cognnitive/` JSON | The plan is a reviewed artifact (preview gate) and stays next to the episode; humans read it through the console Review section, and JSON keeps the slice hashes machine-readable for the console data module. |

### Slice 2: Cascade

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-K1 | Scope class source | Every cascade Field Definition gets `scope:: render\|video\|domain`. `build-field-registry.mjs` emits `scope` and `levels`, and **fails** when `concept::` disagrees with the class's concept set. Layer applicability is the only per-field extra: `Layer ∈ concept::`. | Deriving `cascade` from concepts (today, `:32,76`) | `concept::` stays authoritative for nn-core structural validation. The generator turns any drift into a build error, which removes the hand-kept lists by construction. |
| D-K2 | Resolver | `createCascade({model, scriptPath})` → `.at(sceneSlug?, layerSlug?)` → `.get(field)` = `{value, source, trace}`. The node order outer→inner per level is: presets (in list order), **character node**, explicit fields. The kind level holds Scene Kind direct fields and kind presets. Chrome `music` feeds `background_audio` at the kind level. Setting a field at a level its class does not allow → `CASCADE_LEVEL_FORBIDDEN` at validate. Built on the existing `bagsToChain` + nn-core `resolve`. | Patching each call site | F6 happens because callers pass no scene/layer bag. A resolver that cannot be called without a position fixes every field at once. |
| D-K3 | Frame | `library/frames/<name>/FRAME.md` + optional `caption-skin.html` and `fonts/`. Frontmatter (`colors`, `typography`, `spacing`, `components`) is parsed by nn-core. Emission copies it to `hyperframes/frame.md` (+ skin, fonts). `frameCss` keeps mapping tokens to overlay CSS. | Single-file `<name>.md` (proposal D20 table) | G10: matches HyperFrames exactly, and the skin needs a home. |
| D-K4 | Character | `library/characters/<name>/CHARACTER.md` (`voices: {<lang>: <Voice slug>}`, `default_pose`, `avatar_model`, `avatar_resolution`, `default_background`) + `avatars/`, `backgrounds/`, `voice/`. `pose`/`background` resolve inside the character folder. C9: the validator compares the character node with every nearer preset or explicit node for `voice`, `avatar`, `avatar_model` and `avatar_resolution`, and warns `CHARACTER_OVERRIDDEN`. | Character as an `_NN.md` concept | It is an asset bundle like Frame and Component. It stays out of DomainIndex. See contradiction X4 for how procedures create it. |
| D-K5 | Component | `library/components/<name>/{COMPONENT.md,index.html,preview.mp4}`. The slot contracts move to `skills/nn-conntent/slots/<slot>.html` (engine-internal). `assertSlotContract` is kept. The package `library/components/` holds the 6 engine-authored items, converted, plus vendored registry items with `source: registry:<item>@<ver>` and `LICENSE`. | `ANIMATION.md` (D18 text) | C2 is the accepted fix. |
| D-K6 | Language | `language` is in the video class. `voice` is resolved as `character.voices[language]` or the explicit `voice`. The validator requires `Voice.language === language`, a Chrome with that language, and the character voice for that language, all before spend. `language` is added to the TTS cache key. `translation_of` is a Video-only record field. | Per-scene language | D4. |
| D-K7 | Capability `video` | Rejected by catalog validation (`CAPABILITY_UNSUPPORTED`). The estimator's video-layer branch is deleted (`asset-cost-estimator.mjs:233,276`), together with the `video`/`ai_video` layer types. | Keep it priced at zero | D5. A capability that is never produced cannot appear in a plan. |

### Slice 3a: nn-core `review_gate`

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-G1 | Op shape | `op: review_gate`, `target: <model>@<element>` (or a bare `<model>` for episode-level gates), `gate: <gate>`, `verdict: approved\|needs-change`, `reviewed_hash` (required), `plan_hash?`, `notes?` (the existing change key). It mutates nothing (like `comment`). `reviewGateProblems()` sits next to `addModelProblems` in `types.ts`. `gate`, `verdict`, `reviewed_hash`, `plan_hash` are added to the sealed key list. Owner spec: `changeset-review-gate`. | Reusing `comment` with a convention; overloading `name`/`to` (they mean element name and new field value elsewhere) | D12: a typed op is validated and sealed into `proposal_sha`. |
| D-G2 | Gate declaration | The blueprint frontmatter declares `gates` (`script`, `preview` per element; `budget` per model). Apply rejects a `gate` ∉ the target bluepriNNt's `gates` (`GATE_UNDECLARED`) or a target unit the declaration does not allow (`GATE_TARGET_INVALID`). | A hard-coded list in nn-core | It stays generic (D12). |
| D-G3 | Human origin | A changeset frontmatter carries `author_kind: human`, `reviewer: <name>` and `origin: console` (sealed). `executeChangesetApply` refuses a changeset with a `review_gate` without all three (`GATE_NOT_HUMAN`, `GATE_REVIEWER_REQUIRED`). The `propose_changeset` tool and the bare-intent `apply_change` path refuse `review_gate` outright (`GATE_VERDICT_REFUSED`). `apply_change` still applies a console-downloaded human changeset file (the download fallback). | Signing in the static console | No secret can live in an offline HTML file. See risk R1. |
| D-G4 | No `base_hash` on verdicts | Verdicts carry only `reviewed_hash`. | Generic element `base_hash` precondition | The engine's own mirror and status writes change element hashes, which would break every verdict still in flight. `reviewed_hash` excludes `review` and `status`. |

### Slice 3b: Pipeline and review

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-P1 | Gate granularity | `script` and `preview` are per scene. The preview verdict carries the **scene plan slice hash**. The episode `plan_hash = sha256(sorted slice hashes + prices)`. `budget` (inserted only when `preview ∉ review_gates` and total > `budget`) is episode-level and carries the episode `plan_hash`. | One episode-level `plan_hash` on preview (proposal C3 wording) | An episode-level hash would re-open preview on every scene after a one-scene edit, which contradicts U3. See contradiction X3. |
| D-P2 | Re-open cause (C6) | `gates.mjs` keeps the last approved review subject per scene in `.cognnitive/video/reviews/<s>__<slug>.json`. When the current hash differs, it diffs the subjects, and each changed key reports its source trace ("series voice changed"). A missing snapshot → "content changed". | Storing the cause in the changeset | Changesets stay small and immutable. The snapshot is regenerable machine state. |
| D-P3 | Captions | Per-scene TTS audio → `npx hyperframes transcribe <a> --json --model small.en\|small --language <code>` in a temp cwd → drop words inside a final silence → normalised alignment (NFC → NFD accent strip, casefold, punctuation strip) by LCS over the script tokens → coverage ≥ `CAPTION_MATCH_MIN = 0.90`, else stop before render. Unmatched words are interpolated between matched neighbours. The cache is `cache/video/captions/<sha256(audio sha, text, model, whisper version)>.json`. | An estimated fallback | D6. Words keep the script text. The interpolation only times the ≤10% gap. |
| D-P4 | Spend order | Stages 6→10 below: TTS and images run in parallel (bounded `createLimiter`), then alignment, animatic, preview gate, and avatar last. Avatar keys stay content-addressed (`avatarJobKey`), so after an edit only the changed scenes miss. | — | D8, U3. |
| D-P5 | QA | `qa.mjs` runs at two checkpoints. Master (after render): (1) every manifest overlay id is in `index.html`; (2) ffprobe master duration = manifest total ±1 frame, and each scene's window holds its own content; (3) at each overlay's mid-time, the crop of its emitted bbox has edge density above `QA_TEXT_EDGE_MIN` compared with the same crop at a frame where the overlay is absent. Output set (after formats, thumbnails and description): (4) every format and thumbnail exists with its declared dimensions, and the description exists. Any failure → `status:: failed_qa`, `qa.json`, exit 12, no delivery. | A DOM probe in the renderer | (3) is the only check that catches "emitted but invisible" (F1 Chrome). Needs only ffmpeg, which the engine already requires. |
| D-P6 | Delivery | `outputs_hash = sha256(sorted (name, sha256))` over the master, formats, thumbnails and description, plus `input_fingerprint` (manifest content, linked asset identities, resolved frame). If either equals the latest `deliveries/v<N>/delivery.json` value → no-op (this also absorbs non-reproducible re-encodes). Else assemble `v<N+1>/` in a temporary sibling with `linkOrCopy` (`stage-assets.mjs:78`, copy fallback on EXDEV/EPERM) and `delivery.json`, rename into place, then `status:: delivered`, `delivered_version:: v<N>`. Every hardlinkable output is replaced by rename, never written in place, so earlier links keep their bytes. The HTML is added in Slice 4. | semver | D13, C5. |
| D-P7 | Exit codes | 0 delivered / no-op, 10 a gate is open (`script`, `preview` or inserted `budget`), 11 a spend stop no verdict can satisfy (`budget` unset with a plan total above zero, daily cap), 12 `failed_qa`, 1 error. `--approve` and `--skip-qa` do not exist. | Keeping `--approve` | D11: consent is a human changeset only. |
| D-P8 | Lifecycle | `idea → draft → approved → produced → delivered`, plus `failed_qa` and `archived`. `published` and `published_url` are removed. Any content change re-opens the first gate with a changed hash. `review::` is written by the engine as a mirror, only when its value changed. | A terminal `delivered` | C5. |

### Slice 4: Console

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-C1 | Media | CSP: `img-src 'self' file: data: blob: https:` and `media-src 'self' file: blob:`. Media uses relative `src`. When verification V2 fails, posters are inlined (≤160 KB, today's thumb cache) and media opens through `<a href target=_blank>` (navigation is not covered by `media-src`). | Inlining media | D14: the console stays small. |
| D-C2 | Direct write | "Connect folder" → `showDirectoryPicker()`. The folder is accepted only if `domaiNN_NN.md`'s `workspace_id` matches the payload's. The handle is stored in IndexedDB keyed by `workspace_id` (every `file://` page shares one origin). On each submit (a user gesture): `queryPermission` → `requestPermission`, then write `changes/<ws>_<reviewer>_<stamp>_changes_NN.md` with `flag wx` semantics. Fallback: the existing download. | A local bridge server | D15. A prompt once per session is the worst case. |
| D-C3 | Views | One module `assets/console-view-conntent.{js,data.mjs}` registers `conntent` (tree, Pending inbox, sections) and `conntent-delivery` (read-only, renders the same Episode panel). The data module calls `layout`, `cascade`, `gates`, `review-hash` and `library` from the engine. It never re-implements them. | Two separate view codebases | C10 and D16. One renderer. Effective value plus source comes from the same trace the engine uses. |
| D-C4 | Verdicts | A new draft kind `verdict {gate, verdict, reviewed_hash, plan_hash?, notes}` → exported as `review_gate` (`preview` carries the scene slice hash, `budget` the episode `plan_hash`). The reviewer name is asked once and kept in `localStorage`. The export frontmatter carries `author_kind: human`, `origin: console`, `reviewer`. | — | D11. |
| D-C5 | Regeneration | The writer locator moves from nn-mcp (`console-regeneration.ts:89`) to nn-core (`console/locate-writer.ts`) and is exported through the mirror. `pipeline.mjs` calls `writeConsole` in `finally`. `writeConsole` gains `scope: {view?, models?, readOnly?, outFile?}`. | Duplicating the locator in the engine | C7. One trusted-location policy. |

### Slice 5: Procedures

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D-R1 | Entry point | `nn-conntent` runs `detectState(root)`: no `domaiNN_NN.md` → Set up the Domain; no frame/character → Define…; no series → Create a Series; series with no episode → Plan; episode with an open gate or a draft → Produce. Legacy layout → the `layout.mjs` message. | Free-form agent choice | D20. |
| D-R2 | Library creation | Wizards write library files directly. They are inert until referenced. The closing `proposed` changeset holds the references (`character::`, `frame::`, Voice `add_element`) plus one `produce_artifact` per created file with its sha256. | Library files as `_NN.md` models | X4. HyperFrames needs plain `FRAME.md`. Approval still gates use. |
| D-R3 | `nn-video-script` | It refuses when `domaiNN_NN.md` pins coNNtent or `series/*/*_coNNtent_NN.md` exists. | — | F13. |

## Data Flow: produce

```
produce <episode>
 0 assertLayout(root) ──legacy──► exit 1 (message names the new location)
 1 apply pending changes/*.md where author_kind=human ∧ origin=console (executeChangesetApply)
 2 readEpisode; idea → intake (proposal_changes_NN.md) → draft
 3 validate: registry levels · catalog (Voice.language, capability) · Chrome+voice for language
             · library refs · whisper present if captions≠off ·──fail──► exit 1, $0
 4 gates.script (per scene) ──open──► mirror review::, exit 10
 5 plan (scene slices + slice hashes, episode plan_hash) → plan.json · budget unset ∧ total>0 / daily cap ──► exit 11
   gates.budget if preview∉gates ∧ total>budget ──open──► exit 10
 6 TTS ∥ images (cache-keyed; language in TTS key)
 7 captions.align (if captions≠off) ──<90%──► exit 1
 8 animatic (low-res; avatar = pose still | generated image, real audio)
 9 gates.preview per scene (verdict carries the scene slice hash) ──open──► exit 10
10 avatar (only scenes whose avatarJobKey misses)
11 compile + emit (frame.md, skin, components, captions) → render master
12 qa (master checkpoint) ──fail──► status failed_qa, qa.json, exit 12
13 formats ∥ thumbnails (thumbnail_formats, base, title, badge)
14 description (<slug>_description.md, chapters)
15 qa (output-set checkpoint) ──fail──► status failed_qa, qa.json, exit 12
16 delivery: outputs_hash ∧ input_fingerprint changed ? deliveries/v<N+1>/ + <slug>_delivery.html : no-op → delivered
 finally: review:: mirror (if changed) · regenerate domaiNN console
```

```
console ─verdict(reviewed_hash)─► changes/ (FSA | download→apply_change)
                                     │ produce step 1 applies (nn-core validates human origin)
gates.mjs: applied review_gate ∧ reviewed_hash == reviewHash(current subject) ⇒ approved
           else open + cause(diff(snapshot, current subject))
```

## Interfaces / Contracts

```js
// lib/cascade.mjs
createCascade({ model, scriptPath }) -> { at(scene?, layer?) -> { get(field) -> { value, source, trace: [{level, node, value}] } }, warnings }
// lib/library.mjs
resolveLibrary({ kind: 'music'|'sounds'|'frames'|'components'|'characters'|'media', ref, fromDir }) -> { path, level: 'episode'|'series'|'domain'|'package', searched }
// lib/review-hash.mjs  (canonicalJson from facts.mjs)
scriptSubject(scene, view)  = { narration, kind, layers:[{type, ...fields}], resolved:{ <render fields used by scene>, language, character } }
previewSubject(scene, view, assets) = { script: hash(scriptSubject), tts, images, captions, avatarItems }
reviewHash(subject) -> sha256(canonicalJson(subject))   // excludes review, status
// lib/gates.mjs
gateState({ episode, cascade, changesets, gates, plan }) -> [{ gate, scene|null, state: 'open'|'approved'|'needs-change', currentHash, reviewedHash, reviewer, cause }]
```

```yaml
# changeset written by the console
author_kind: human
origin: console
reviewer: "Lucas"
---
op: review_gate
target: botijos-today/gas-pump@scene-2
gate: preview
verdict: approved
reviewed_hash: <sha256>
plan_hash: <scene slice sha256>
```

`deliveries/v<N>/`: `<slug>_<W>x<H>.mp4`…, `<slug>_thumbnail_<W>x<H>.png`…, `<slug>_description.md`, `<slug>_delivery.html`, `delivery.json {version, outputs_hash, input_fingerprint, files:[{name, sha256}], plan_hash, created_at}`.

## File Changes

Paths are relative to `iNNfo/specs/bluepriNNts/coNNtent/` (`E` = `skills/nn-conntent/scripts/`) unless absolute.

| File | Action | Slice | Description |
|---|---|---|---|
| `spec_NN.md` | Modify | 1–3 | Placement `episodes/`; `scope::` on every cascade field; Character/Frame/Component in prose; new fields; `gates:` frontmatter; removes `script_review`, `published_url`, `thumbnail`; `blueprint_version` bump |
| `defaults/video-defaults_NN.md`, `catalog/model-catalog_coNNtent_NN.md` | Modify | 2–3 | `review_gates`, `captions`, `thumbnail_formats`; Voice `language`, `es` voices, system voices, `max_seconds`/`max_concurrency` |
| `library/frames/neutral/FRAME.md`, `library/components/<name>/*` | Create | 2 | Package floor. Moved from `skills/nn-conntent/frames/neutral.md` and `components/*.html` |
| `skills/nn-conntent/slots/<slot>.html` | Create (move) | 2 | Slot contracts |
| `E/lib/{layout,library,cascade,review-hash,gates,captions,qa,delivery,pipeline}.mjs` | Create | 1–3 | The modules listed above |
| `E/lib/video-scope.mjs` | Modify | 1–2 | Keeps `bagsToChain`/`loadCascadeBags` internals for `cascade.mjs`; deletes `findNearest*` and the public `resolve`/`resolveKeyed` |
| `E/lib/video-guard.mjs` | Modify | 1 | Deletes `GUARD_FILENAME`, `DEFAULT_GUARD`, `loadGuard`, `validateConfig`, ledger fns; `SpendGuard` reads the catalog + cascade |
| `E/lib/{compile,episode,plan,avatar-jobs,tts-options,image-options,frame-tokens,field-consumers,changes,catalog}.mjs` | Modify | 1–3 | Call `cascade`/`library`; `pendingReviews` deleted; `readComments` → `readChangesets`; consumers for new fields |
| `E/produce.mjs` | Modify | 3 | CLI over `pipeline.mjs`; `modelIdOf` on `episodes/`; `--approve` deleted |
| `E/asset-cost-estimator.mjs` | Modify | 2 | Thin view over `plan.mjs`; video pricing deleted |
| `E/render-thumbnail.mjs`, `render-formats.mjs`, `scene-compiler.mjs`, `voice-clone.mjs`, `synthesize-avatar.mjs` | Modify | 2–3 | Cascade/library inputs; composition id = slug; the clone writes a catalog `Voice{language}` |
| `E/build-field-registry.mjs`, `E/lib/field-registry.generated.json` | Modify / Regenerate | 2 | `scope`, `levels`, consistency failure |
| `assets/console-view-episode-review.*`, `assets/console-view-series.*` | Delete | 4 | Replaced |
| `assets/console-view-conntent.{js,data.mjs}` | Create | 4 | D-C3 |
| `procedures/usage_procedures_NN.md`, `skills/nn-conntent/SKILL.md`, `references/*.md` | Modify | 1, 5 | Six procedures; names reconciled; `video-guard` removed |
| `iNNfo/packages/nn-core/src/changeset/{types,parser,serializer,hasher}.ts` | Modify | 3a | `review_gate`, `reviewed_hash`, `plan_hash`, frontmatter `author_kind`/`origin`/`reviewer` |
| `iNNfo/packages/nn-core/src/console/locate-writer.ts` | Create | 4 | Moved locator |
| `iNNfo/packages/nn-mcp/src/tools/{propose-changeset,apply-change,console-regeneration}.ts` | Modify | 3a, 4 | Refusal; human-origin check; import the locator |
| `scripts/core-mirrors/coNNtent.ts`, `E/lib/nn-core.generated.cjs` | Modify / Regenerate | 3a, 4 | Export frontmatter parser and locator |
| `iNNfo/specs/bluepriNNts/console/{artifact_shell.html,nn-runtime.js}` | Modify | 4 | CSP; scope models/readOnly; FSA dir write; verdict kind |
| `scripts/export-console.mjs` | Modify | 1, 4 | `LEGACY_EPISODE` skip → `assertLayout`; `scope{models,readOnly,outFile}` |
| `nn-video-script` SKILL / scripts | Modify | 5 | Refusal |
| Tests in `skills/nn-conntent/test/` that encode `assets/<slug>`, `video-guard.json`, `script_review`, `review::` approval or video pricing | Modify/Delete | each | Rewritten red-first |

## Testing Strategy (Strict TDD, red first)

| Layer | Test | Asserts |
|---|---|---|
| Unit | `layout.test.mjs` | One message per legacy path; a clean tree passes |
| Unit | `library.test.mjs` | Nearest wins; the prefixes force a level; `..`/absolute/`\` rejected; package floor warning only |
| Contract | `cascade-scope-classes.test.mjs` | For **every** registry field × every level allowed by its class: a sentinel set only there resolves with `source = level` through `createCascade`, **and** the plan built by `plan.mjs` (which the estimator prints) carries it. Each forbidden level → `CASCADE_LEVEL_FORBIDDEN`. Character node order and the C9 warning. |
| Unit | `build-field-registry.test.mjs` | A `concept::`/`scope::` mismatch fails generation |
| Unit (nn-core) | `changeset/review-gate.test.ts` | Shape problems, seal, round-trip, undeclared gate, non-human refused |
| Unit (nn-mcp) | `propose-changeset.spec.ts`, `apply-change-rejections.test.ts` | `GATE_VERDICT_REFUSED` (propose and bare-intent apply); a human console changeset file applies |
| Unit | `gates.test.mjs` | An agent `review:: approved` opens nothing and is flagged; a stale hash refuses with the C7 text; a scene-2 edit re-opens only scene 2, with a cause; the budget gate is inserted exactly once |
| Unit | `captions.test.mjs` | Fixture transcribe JSON: 89% → stop, 90% → timings; silent tail dropped; model per language; cache key |
| Integration | `qa.test.mjs` | A fixture render whose watermark is emitted but transparent → `failed_qa` (the F1 regression) |
| Integration | `delivery.test.mjs` | v1; identical rerun → none; change → v2 with v1 bytes unchanged; EXDEV → copy |
| E2E | `produce-cold-cache.test.mjs` | Empty cache, fake providers via `synthesizerOptions`: stop 10 at script → human fixture changeset → stop 10 at preview with **zero avatar calls** → approve → delivered v1; TTS precedes avatar; rerun is a no-op |
| Runtime | `console-conntent-view.test.mjs` (jsdom) | Inbox home, effective value + source, verdict export frontmatter, delivery view read-only |

## Open verifications: what each one gates

| Verification | Gates | Fallback |
|---|---|---|
| V1 FSA persistence on `file://` | D-C2 storing handles in IndexedDB | Re-pick the folder per session; then the download + `apply_change` path |
| V2 CSP relative media on `file://` (Chrome, Edge) | D-C1 `<video src>` in both consoles | Inlined posters + an "Open" link per media in a new tab |
| V3 `transcribe` word timings on Windows | `captions: words` | `captions: lines` from segment timings; `words` → validation error on that machine; `off` always valid |
| V4 Chrome overlay invisibility root cause | Nothing in the design. QA (3) catches it regardless | QA test fixture reproduces the symptom |
| V5 Registry licenses | Which vendored items ship in `library/components/` | Ship only the 6 engine-authored items, converted; each vendored item needs a `LICENSE` and a pin |

## Contradictions found (spec alignment required)

| # | Conflict | Resolution in this design |
|---|---|---|
| X1 | openspec `<s>_series_NN.md` / `<slug>_coNNtent_<s>_NN.md` vs spec_NN `<slug>_coNNtent_NN.md` | nn-core invariant (G1): `<slug>_coNNtent_NN.md` for both |
| X2 | Decision record D18 `library/animations/…/ANIMATION.md` and D20 "seven procedures, Deliver" vs C2/C4 | C2/C4 win (accepted fixes): `components/COMPONENT.md`, six procedures |
| X3 | C3 "preview carries the approved `plan_hash`" vs U3 scene-scoped re-open | Per-scene slice hash (D-P1) |
| X4 | "Setup wizards end in a `proposed` changeset" vs CHARACTER/FRAME/COMPONENT being non-`_NN.md` files that changesets cannot create | D-R2: files are inert until referenced; `produce_artifact` records them |
| X5 | Proposal D20 table `library/frames/<name>.md` vs D17 `caption-skin.html` | Folder form (D-K3) |
| X6 | D16 "one registered view" vs C10 "read-only `delivery` view" | One module, two registration ids (D-C3) |
| X7 | The mockup shows a "Deliver v1" button (vs C4 automatic) and "Clean orphans…" (out of scope) | Both are removed from the view ("No Control Without Effect") |
| X8 | D11 "impossible by construction" | Only true for tools. An agent with filesystem access can hand-write a human changeset (R1) |
| X9 | Proposal F12 says the CSP is `img-src data: blob:` | It is `'self' data: blob: https:` with no `media-src` (G4). Same conclusion |

## Migration / Rollout

No migration (premise). Slices land as chained PRs 1 → 2 ∥ 3a → 3b → 4 → 5. Release keys: `blueprints-v*` (coNNtent `blueprint_version` bump, and changes `gates` support), `nn-core`/`nn-mcp`/`nn-console`, `skills-v*`. Versions are derived with `scripts/sync-versions.mjs`. Cut the templates tag in the same release run (memory: `validate-manifest` byte-checks main against the pin). Regenerate `nn-core.generated.cjs` and the registry in every slice that touches them (drift guards). New relative imports carry `.js`.

## Risks

- **R1** A forged `author_kind: human` file written directly to `changes/` by an agent is undetectable. Mitigation: tool refusal, a reviewer name shown in the inbox and history, and the residual risk documented. A real fix needs a secret, which an offline console cannot hold.
- **R2** The QA (3) edge-density heuristic needs tuning against real frames. The threshold is a named constant and is calibrated on the botijos frames.
- **R3** Unspaced languages cannot use `words` captions in v1 (G9).
- **R4** An animatic render adds wall-clock time (about 20–25% of a master render, estimated).
- **R5** The 400-line budget: Slices 2 and 3b will each need sub-chains.

## Open Questions

Moved to the proposal's "Open product questions (pre-apply)" (items 2, 3 and 11), where the specs' recommended defaults are listed:

- [ ] Should `captions: words` for zh/ja be a hard validation error (default) or fall back to `lines`?
- [ ] Should Chrome `music` feeding `background_audio` at the kind level (D-K2) be confirmed (F9 precedence)? The specs adopt it.
- [ ] Animatic resolution and fps: default 640 px wide, 15 fps?
