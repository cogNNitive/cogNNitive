# Design: Video Template Architecture

## Technical Approach

Build the reusable video layer entirely inside cogNNitive without touching innfo-core, innfo-mcp, VidGeNN or any workspace. Four moves:

1. A new zero-dependency skill `skills/nn-video-script/`, forked from VidGeNN's `anydeo-script-builder`. It owns the authoring workflow and ships small Node scripts for the gates.
2. Series and Subject are pure **conventions**. There is no new Level-2 template.
3. The existing iNNfo file-field rule `{modelDir}/assets/{slug}/` stays untouched. D4 is satisfied by *where the Series model file lives*.
4. The VUS pin is a nested block in `manifest/source.yaml`, checked by the existing `check-parity.js`.

Naming amendment applied: **Subject** replaces the proposal's "Project" throughout. The hierarchy is Workspace → Subject → Series → Video.

## Architecture Decisions

| # | Decision | Rejected alternative | Rationale |
|---|---|---|---|
| AD1 | **Series = folder + one Level-3 `video` model** at `series/<s>/<Name>_V_x-y-z_video_NN.md`. Its frontmatter holds a `series:` block, and it contains that Series's Video Elements. | New `series` Level-2 template; a separate `series.yaml` | Needs no template, catalog or editor work. The model file doubles as the registry. Membership is exactly-one by construction, because an Element lives in exactly one file. |
| AD2 | **Subject = any Element of a workspace-custom model** (e.g. iNNtrevistas `Innovacion`). The Video binds it through the reserved `sources::`: exactly one entry `models/<file>_NN.md#<element-slug>`, then any `sources/nn/...` anchors. | New `subject::` Field on Video | The proposal freezes the Video fields. `sources::` already means "what this video derives from". The exactly-one rule is enforced by the procedure's Frame step. |
| AD3 | **`{modelDir}` resolution is unchanged.** Because the Series model sits in `series/<s>/`, videos resolve to `series/<s>/assets/<video-slug>/`. The proposal's illustrative `videos/<slug>/` becomes `assets/<slug>/`. | Change the rule to `{modelDir}/videos/{slug}` | The rule is hard-coded in `innfo-core/src/recursiveParser/normalize.ts:313` and `innfo-mcp/src/tools/apply-change.ts:643` (folder move on rename). Changing it forces an MCP 6-ref release, and D4 does not need it. |
| AD4 | **VUS pin = nested `external_specs` on the skill entry**, compared by `check-parity.js` against the SKILL.md frontmatter. | A channel `refs` row keyed to `innV0/VidGeNN`; vendoring the JSON | The stable channel requires `*-v*` tags on a main-reachable commit, and VidGeNN is read-only with no such tags. Vendoring would create a third copy, which is the exact failure mode already seen (the 1145-line vs 1963-line copies). `generate-manifest.js` renders only known keys, so the block never reaches the published manifest. |
| AD5 | **The placeholder gate runs first, then the VUS parser**, as two sub-checks of a single Validate step. | Parser only; interleaved checks | `vus.peggy` accepts a leaked `{{x}}` as narration, so the parser can never catch it. Failing fast keeps the parser report clean. |
| AD6 | **Finalize copies; it never moves.** It writes fixed filenames and leaves the model edit to innfo-mcp. | The script edits `_NN.md` directly | This keeps a single writer for model files. `renders/` stays a disposable cache. |

## Folder Contract (D4)

```
<workspace>/
  .gitignore                     # **/renders/  **/.anydeo/   (ensured by procedure)
  assets/                        # workspace scope - never referenced by scripts
  models/<Subject>_V_.._NN.md    # Subject model (workspace-custom)
  series/<s>/
    <S>_V_x-y-z_video_NN.md      # Series registry + Video Elements (modelDir)
    series_procedure_NN.md       # Level-3 procedures model; delegates to the generic one
    script_template.md           # {{slot}} template
    series_rules.md              # series-wide rules only
    shared/                      # series scope (workspace assets are staged here by copy)
    assets/<video-slug>/         # video scope = Element-owned folder
      script.md  master.mp4  thumbnail.png  voiceover.<ext>  media/
      renders/<ref>/  .anydeo/   # VidGeNN writes these next to the script (verified: render.rs, helpers.rs)
```

The escape rule: every relative asset path in `script.md` must resolve inside `series/<s>/`. For example, `../../shared/x.mp4` is allowed and `../../../../assets/x` is rejected. `http(s)://` paths are allowed. `file://`, absolute paths and `asset://` are rejected. Each Series model is registered in the workspace Models catalog with `path:: series/<s>/...`.

## Interfaces / Contracts

**`manifest/source.yaml`**: add a new `skills` entry.
```yaml
  - name: nn-video-script
    repo: cogNNitive/cogNNitive
    path: skills/nn-video-script
    version: "V_0-1-0"
    ref_key: skills
    requires: [nn-innfo]
    description: Author, gate, and finalize VidGeNN (VUS) video scripts inside iNNfo Series.
    external_specs:
      - name: vus
        repo: innV0/VidGeNN
        path: packages/core/specs/V_0-3-3.json
        version: "V_0-3-3"
        sha256: "<LF-normalized sha256 at pin time>"
```

**SKILL.md frontmatter diff** (relative to the fork source):
- `spec_version:` is removed.
- `version: "V_0-1-0"` is added.
- The following block is added:
  ```yaml
  vus_spec:
    version: "V_0-3-3"
    sha256: "<same hash>"
  ```

**`check-parity.js` additions.** For each `skills[].external_specs[]`, the script runs these checks:
- (a) `version` and `sha256` must equal SKILL.md `vus_spec`.
- (b) `path` must match `^packages/core/specs/V_\d+-\d+-\d+\.json$`. This rejects the stale `.agent/skills/...` copy by construction.
- (c) The basename must equal `${version}.json`.
- (d) Only if `VIDGENN_ROOT` is set, it compares the hash of the local file (BOM stripped, CRLF→LF) and checks that `info.version` matches.

When the variable is unset, the script prints an explicit skip line. It never probes default paths (see the lesson in `preflight-tests-leak-real-home-dir`).

**Skill layout (the fork)**

| Path | Role |
|---|---|
| `SKILL.md` | Workflow and rules. No voice IDs and no property tables; points at `vus-spec.mjs`. |
| `references/vus-authoring-notes.md` | Syntax quirks from iNNtrevistas: header line, `![](…)` over `layer_asset_source`, `auto_media`. |
| `references/series-template-convention.md` | `{{slot}}` + `<!-- slot: … -->` instruction comment. Rules document shape. |
| `references/folder-contract.md` | D4 as above. |
| `scripts/vus-spec.mjs` | Resolves `$VIDGENN_ROOT/packages/core/specs/<v>.json` and verifies the pinned hash, then queries it (`voices`, `props <scope>`). |
| `scripts/check-script.mjs` | The gate, run in order: `{{…}}` regex `/\{\{[^{}]*\}\}/g` → leftover `<!-- slot:` → first line `//ANYDEO_SPEC: <pinned>` → asset escape. Exits 1 with `line:col` findings. |
| `scripts/vus-parse.mjs` | Runs `npx tsx` against `$VIDGENN_ROOT/packages/core/src/index.ts` → `ScriptParser`. Requires 0 issues. |
| `scripts/finalize-video.mjs` | See Data Flow. |
| `test/*.test.mjs` | Auto-gated by `verify.js` `collectTestSuites(skills/)`. |

## Data Flow

```
Frame (Subject + Series, stage ws assets -> shared/)
  -> Author script.md from script_template.md
  -> Validate: check-script.mjs  --fail-->  stop
               vus-parse.mjs     --fail-->  stop
  -> Register script (innfo-mcp: script:: script.md, status scripting)
  -> Render (VidGeNN, user-driven) -> assets/<slug>/renders/<ref>/
  -> Finalize: finalize-video.mjs -> master.mp4, thumbnail.png, voiceover.*
  -> Register assets (innfo-mcp: master/thumbnail/voiceover, status rendering)
```

`finalize-video.mjs --video-dir <dir> [--ref <r>] [--force-thumbnail]` works as follows:
1. It picks `renders/<ref>/`. If there are several candidates and no `--ref`, it fails.
2. It copies `<ref>.mp4` → `master.mp4`.
3. It copies `<ref>_thumbnail.png` → `thumbnail.png`, but only when no thumbnail exists or `--force-thumbnail` is passed. Series often design their own thumbnail.
4. It copies `<ref>_voiceover.*` only if that file is present. VidGeNN emits no voiceover file today.
5. Each copy goes to a temp file, then a rename.
6. It prints the field values to set.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `check-script` (leaked slot, leftover comment, wrong header, escape vs. allowed `../../shared`) | Strict TDD, fixture strings |
| Unit | `finalize-video` (single/ambiguous ref, thumbnail preserve, missing voiceover) | Temp dirs |
| Unit | `check-parity` external_specs (mismatch, `.agent/` path, env skip) | Extend `check-parity.test.js`; clear `VIDGENN_ROOT` |
| Integration | Real parse of the sample series script | Runs only with `VIDGENN_ROOT` set; skip otherwise |

## Migration / Rollout (sdd-tasks: sequence exactly)

1. **Content commits on `dev`.**
   - Add the skill.
   - Edit `video/spec_NN.md`: `template_version` goes from `V_0-2-1` to `V_0-3-0`. `spec_version` stays `V_0-2-1`, and so does the manifest `version:`, because those are two separate version axes.
   - Rewrite `procedures/generate_anydeo_script_NN.md`.
   - Add `samples/series-kit/{script_template.md,series_rules.md}`. The Ghostbusters sample model is unchanged; it is already valid under AD3.
2. **Same batch.**
   - Bump `SHIPPED_TEMPLATE_VERSIONS.video` in `innfo-editor/src/config/samples.ts`.
   - Run `template-catalog.mjs` and `sync-template-versions.mjs`.
   - Add the `source.yaml` skill entry and extend `check-parity.js`.
3. **Freeze.** After the last `spec_NN.md` edit, cut `templates-v0.14.0` and `skills-v2.2.0`. `checkTemplateMainCoherence` byte-compares the pinned tag against main, so any later spec edit needs a new tag.
4. **Repin commit.** Update `channels.stable` refs and regenerate the stable manifest doc (`generate-manifest.js --check` is step 8).
5. Fast-forward `dev:main` as one batch, then run `verify --release`. Follow `nn-dev-release`.

The workspace-level `workspace_spec_NN.md` is **not** edited. The `series/` convention lives in the video template prose and the `workspace-directory-conventions` delta.

## Open Questions / Risks

- [ ] The `ScriptParser` API shape and the `tsx` availability in `vus-parse.mjs` must be confirmed during apply. VidGeNN core ships TypeScript source only.
- [ ] Custom `series:` frontmatter on a Level-3 model: confirm that innfo-core validate tolerates it with a fixture. Fallback is a `series_NN.md` sidecar.
- [ ] `sources::` carrying a `models/…` anchor stretches the reserved property's documented `sources/nn/` shape. If spec picks a different Subject binding, sdd-tasks reconciles.
- [ ] `renders/` sits inside Element-owned folders. Rename moves it along, and editor media scanners may list render files. This is out of scope and noted only.
- [ ] Cross-repo drift is only detected where `VIDGENN_ROOT` is set. CI checks the local pin only.
