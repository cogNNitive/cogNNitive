# Design: Console cleanup and shell lint

## Technical Approach

A new zero-dependency CommonJS guard, `scripts/lib/console-shell-guard.js`, is shaped like `legacy-ledger-guard.js`: a pure `validate*` function, a CLI block, and a `.test.js` suite that `collectTestSuites` picks up. It checks three things, all derived from existing sources of truth:

- **capabilities**: `console/needs-registry.json`, reduced to needs and anchors;
- **pins**: `getConsoleReleaseInfo()` in `scripts/lib/console-release-info.js`, which reads `manifest/source.yaml` through `channel-refs.js`;
- **DOM**: the shell file itself.

Dead shells are deleted rather than migrated.

## Verified corrections to the proposal

| Claim | Finding |
|---|---|
| D5: `markers` has two types | False. `element.markers` is a map and `schema.markers` is a list of definitions (`compile_model_console_NN.md:159,188`; bundle `:3280`). There is no code change. A contract test pins both types. |
| D5: export only rewrites one shell's pin | The exporter only ever reads `artifact_shell.html`, and it already rewrites every `@innfo-console-vX` there. The real gap is that only the version is replaced. The repo (`cogNNitive/cogNNitive` vs the manifest's `cogNNitive-web`) and the `templates/console` path survive. |
| Thin shells are "orphans" | Worse: they are broken. They have no `innfo-*` anchors, so the bundle renders nothing into them. |
| `innfo-config.runtime` | It is dead. `parseConfig` reads it (bundle `:292`) and nothing uses it. It is a fourth copy of the pin. |

## Architecture Decisions

| # | Decision | Rejected | Rationale |
|---|---|---|---|
| D1 | Registry = `{ needs: { <id>: { description, anchors: string[][], renderer? } } }`. `anchors` is any-of over all-of id sets. Top-level `version`, `runtime`, `renderers` and per-need `since` are removed. | Keep pins in the registry | The bundle never reads the registry: it is offline and has no fetch. Its readers are the guard, `metrics/scripts/verify.harness.js` (`needs` only, so it stays compatible) and tests. Pins in the registry were a copy that drifted to 0.1.0. |
| D2 | Pin source of truth is `manifest/source.yaml` `console_assets[innfo-console].version`, read through `getConsoleReleaseInfo`. | Registry or shell as the source | This is the same fact `build-console-bundle.mjs` stamps and `channel-refs.js` turns into the tag. One source, zero literals. |
| D3 | Q1: drop the `assets:` entries of analysis, documentation, innovation, organization, projects and business, and delete the files. | Repoint them to the seam | `assets:` paths are blueprint-relative, and the seam is not a blueprint. `resolver-node.ts:734` lists the `assets/` directory, so nothing dangles. The replacement is the blueprint-agnostic `workspace/procedures/compile_model_console_NN.md` plus `model_console.html`. `layout` and `title` are read by nothing, so no per-blueprint config survives. |
| D4 | Q2: add no anchors to `model_console`. Instead, one ledgered exception in the guard. | Add anchors now | Per the coordinator. The exception expires by design. |
| D5 | Q3: regenerate `canonical-registry.ts`, but do not rebuild `innfo-mcp/bin/innfo-mcp.bundle.js`. | Rebuild the bundle now | No gate needs it: `check-parity` checks presence only, and `cdn-bundle-staged` checks that the file exists. A rebuild at the unchanged `0.12.0` would be re-copied by `build-docs.mjs:85-86` onto `docs/innfo/cdn/innfo-mcp-v0.12.0.bundle.js`, which mutates a published version. The stale mirror only affects offline-fallback frontmatter. It ships with the next `innfo-mcp` release. |
| D6 | The exporter replaces the whole CDN URL (owner, repo, tag and path) with a constant built from the banner version. | Version-only regex | The exporter must run without the manifest (#91). A test ties its output to `getConsoleReleaseInfo().cdnUrl`. |
| D7 | Procedure wording "pins resolve via `needs-registry.json`" is left alone (compile_model_console, business/metrics apply_feedback, create_timeline). | Edit now | Change 3 rewrites those procedures anyway. Editing them now would force two extra `blueprint_version` bumps. `metrics-console-gate.test.ts:115` only asserts the mention. |

## Guard contract

```js
// scripts/lib/console-shell-guard.js
validateConsoleShells({ repoRoot, lsFiles?, readFile?, releaseInfo? })
  // -> { ok, errors: string[], shells: Array<{ path, needs }> }
discoverShells(files) // console/artifact_shell.html + bluepriNNts/*/assets/*.html containing id="innfo-config"
                      // generated samples/ and */export/ are out of scope
```

The guard checks, per shell:

- **C1**: `innfo-config` parses, and `needs` is a non-empty string array with no `runtime` key.
- **C2**: `needs` ⊆ the registry keys.
- **C3**: for each need, some anchor set is fully present as `id="…"`.
- **C4**: every bundle `<script src>` is exactly `cdnUrl`, `https://raw.githubusercontent.com/<repo>/main/iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js`, or `./innfo-console.bundle.js`. The vendored tag is required, and `@main` is never allowed on jsDelivr.

It also checks the registry itself:

- **R1**: only the keys `needs`, `description`, `anchors` and `renderer` may appear.
- **R2**: no string may match `https?://` or `-v\d+\.\d+\.\d+`.

Anchor table (seeded from the bundle's `getElementById` calls; apply re-derives each from its bundle line):

| need | anchors |
|---|---|
| feedback-export | `[[innfo-banner, innfo-export-open, innfo-export-modal]]` |
| concept-rail | `[[innfo-rail],[rail]]` |
| fulltext-search | `[[innfo-search],[search]]` |
| matrix-grids | `[[innfo-matrices],[content]]` |
| reference-popup | `[[innfo-ref-dialog]]` |
| document-view | `[[innfo-doc]]` |
| charts | `[[innfo-charts]]` |
| timeline-grid | `[[innfo-timeline-grid]]` |
| guided-procedure | derive from `render-procedure-stepper.js` boot |
| hash-routing | `[]` |

**The exception.** `ANCHOR_EXCEPTIONS = [{ shell: 'iNNfo/specs/bluepriNNts/workspace/assets/model_console.html', need: 'feedback-export' }]`. It carries the marker `legacy:console/model-console-feedback-anchors`, and `model_console.html` carries the same marker in a comment. Its ledger entry in `legacy-ledger.yaml` records owner `2026-09-30-console-feedback-roundtrip` and removal "bundle injects feedback UI". An exception that is no longer needed is an error: the shell no longer declares the need, already has the anchors, or is gone. Tests build the marker by concatenation, as `legacy-ledger-guard.test.js:18` does.

**Wiring.**

- `verify.js`: new step 7f `run('node scripts/lib/console-shell-guard.js', …)`, after 7d, because it reads the manifest.
- `check-integrity.js`: Group 2e, which `require`s the guard and prints errors. This mirrors Group 2d.

## File Changes

| File | Action |
|---|---|
| `scripts/lib/console-shell-guard.js` + `.test.js` | Create |
| `scripts/verify.js`, `scripts/check-integrity.js`, `legacy-ledger.yaml` | Modify (wire, add 1 entry) |
| `console/needs-registry.json` | Rewrite to D1 |
| `console/artifact_shell.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`, `procedures/assets/procedure_console.html` | Pins go to the manifest version, the path to `bluepriNNts/console`, the repo to the manifest repo. The pin is what forces the path (Q4 exception). Drop `config.runtime`. Fix the header comments. |
| `{analysis,documentation,innovation,organization,projects}/assets/*_console.html`, `business/assets/model_viewer.html` | Delete |
| 6 `spec_NN.md` (the D3 set) | Remove `assets:`, patch-bump `blueprint_version`. For business, also remove the `:185-187` transition sentence. |
| `innfo-core/src/schema/canonical-registry.ts` | Regenerate (`generate-canonical-registry.mjs`) |
| `scripts/export-console.mjs` + `export-console.test.mjs` | D6. Drop `config.runtime`. Assert both markers types. |
| `innfo-core/tests/console-{shell,renderers,thinning,citations-dom}.test.ts` | Registry assertions become capability-only. Drop the model_viewer seam block and the `git show HEAD` byte test. Repoint the citations DOM fixture to `model_console.html`, which has `#doc-title` and `#rail`. |
| `docs/innfo/documentation/{console-needs-and-visuals,offline-consoles}.md` | Registry = capabilities. Remove the shell list. |
| `manifest/source.yaml`, `console/innfo-console.bundle.js` | Set `blueprints` 0.20.0 and `console_assets` 0.7.0 (all 3 entries), then rebuild the banner |

Out of scope: `workspace_hub.html:265-274` (six of the eight entries point at procedures that do not exist; this is unchanged by these deletions and needs a follow-up). Legacy `templates/` literals that the pin does not touch (they belong to the rename). Fixtures under `innfo-core/tests/**/fixtures`. `simulation/FINDINGS.md`.

## Testing Strategy (strict TDD, every test must be able to go red)

| Seam | Red case, then green |
|---|---|
| `validateConsoleShells` (tmp repo fixtures, literal manifest versions, never computed like the code) | Unknown need; missing feedback anchor; `rail` alternative accepted; `@main` jsDelivr; stale tag; wrong repo; missing vendored tag; `config.runtime` present; registry holding a URL; stale exception |
| Real tree | The guard CLI exits 0. A copy of the real `model_console.html` without the exception goes red on feedback-export, which is the proposal's success criterion. |
| Exporter | Output pins equal `getConsoleReleaseInfo().cdnUrl` for a fixture; no `templates/console`; `element.markers` is an object and `schema.markers` is an array |
| Consumers | `rg` proves 0 non-fixture readers of the 6 deleted files. This runs as a test before the deletion. |

Gates per slice: `node scripts/verify.js`, `npm run lint`, `npm run typecheck`, and `npm --workspace=@cognnitive/innfo-core test`.

## Slices (chained, each green on its own)

1. **Cleanup** (~780 lines, ~700 of them deletions): the consumer-proof test, the 6 deletions, the spec edits and bumps, the canonical-registry regeneration, test repoints, and `blueprints` → 0.20.0.
2. **Guard** (~350 lines): registry D1, C1-C3 and R1-R2, the ledger exception, wiring, the model_console marker.
3. **Pins, export and release** (~250 lines): C4, D6, pins across the 4 shells, `console_assets` → 0.7.0, the bundle rebuild, and the docs.

C4 lands in slice 3, so the pins move only once.

## Release sequence

Tags are append-only.

1. Run `node scripts/sync-versions.mjs`, then `check-integrity --pre-push` on `dev`.
2. `git push origin dev:main`.
3. Right away, on `origin/main`, tag `blueprints-v0.20.0` and `innfo-console-v0.7.0`, and push both. Refs are derived by `channel-refs.js`: `blueprints` from its channel `version`, `innfo-console` from `console_assets`. None are hand-typed.
4. Run `verify.js --release` (validate-manifest).

There is no `innfo-mcp` release (D5).

## Open Questions

- [ ] Confirm that the `innfo-console-v*` tags resolve on jsDelivr under `cogNNitive/cogNNitive-web` (the manifest repo). Today's shells use `cogNNitive/cogNNitive`.
- [ ] Whether to bump `blueprint_version` on metrics, procedures and workspace for asset-only pin edits. Assumed no: they ride the new `blueprints-v` tag.
