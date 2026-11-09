# Apply Progress — coNNtent bluepriNNt Redesign

Tracker branch: `feat/conntent-redesign`. Chained PRs target the previous PR branch.
Full task map: `tasks.md`. Verifications: `verifications.md`.

> Progress is recorded before and after each slice (handoff rule 6). Checkboxes mirror
> `tasks.md`; each PR also records its base branch, PR number, and diff-stat.

## Phase 0: Open verifications (PR V)

- [ ] V.1 FSA on `file://` — **BLOCKED on maintainer browser run** (Chrome/Edge, native folder picker).
- [ ] V.2 CSP media on `file://` — **BLOCKED on maintainer browser run**.
- [ ] V.3 `hyperframes transcribe` word timings — **BLOCKED on consent to install whisper.cpp** (not on PATH).
- [ ] V.4 Chrome overlay after hotfix — **BLOCKED on render + browser inspection**.
- [x] V.5 Registry licenses and pins — **DECIDED**: vendor from `heygen-com/hyperframes`
      (Apache-2.0) pinned to an exact upstream commit; ship per-item `LICENSE` and
      offline-vendored CDN deps; network-clean `index.html`.
- [ ] V.6 Decision checkpoint — **PENDING** V.1/V.2/V.3/V.4.

**Status:** V.5 recorded. V.1/V.2/V.4 need the maintainer's Chrome/Edge; V.3 needs
whisper.cpp consent. No PR 2e, 3b-3, or 4a may start before its verification is recorded.
Slices 1a–1c (Phase 1) do not depend on a recorded verification and may proceed.

## Slice 1 — Structure (PRs 1a–1c)

### PR 1a — layout contract. **SPLIT into two chained PRs** (each < 400 lines, repo rule).

#### PR 1a-layout (`feature/conntent-redesign-v1a-layout`, base: tracker) — DONE, green
- [x] 1a.1 RED `T/layout.test.mjs` — LAYOUT_LEGACY per legacy path; clean tree passes.
- [x] 1a.2 GREEN `E/lib/layout.mjs` `assertLayout(root)` — 6 tests green.
- Diff vs tracker: `layout.mjs` + `layout.test.mjs`, 239 insertions, **under budget**.

#### PR 1a-chain (`feature/conntent-redesign-v1a`, base: v1a-layout) — DONE, green
- [x] 1a.3 RED `T/export-console-episodes.test.mjs` — assets episode reported, episodes/ discovered.
- [x] 1a.4 GREEN `scripts/export-console.mjs` (silent LEGACY_EPISODE skip → `assertLayout` warning),
      data module `EPISODE_DIRS=['episodes']` only, `E/produce.mjs modelIdOf` on `episodes/`.
- [x] 1a.5 RED `T/placement.test.mjs` — placement `{container}/episodes/{slug}/`.
- [x] 1a.6 GREEN `BP/spec_NN.md` Video placement → `episodes/` + `blueprint_version` → `V_0-16-0`,
      derived artifacts regenerated (catalog.json, field-registry).
- [x] 1a.7 Data module `EPISODE_DIRS` narrowed to `['episodes']` (dropped `assets`).
- [x] 1a.8 RED+GREEN `T/production-hierarchy.test.mjs` — domaiNN→Series→Video; no Subject concept.
- Diff vs v1a-layout: 288 insertions, **under budget**.

**Status:** tracker `feat/conntent-redesign` verde y empujado (HEAD b6d072e5, verify:fast 227/227 tras cada commit). Aterrizado en esta pasada:
- **Slice 1b COMPLETA** (1b.1-1b.6). **1c.1/1c.2** (nombres + composition id = slug), **1c.3+1c.4** (ledger único), **1c.5** (`spendGuardFromDocuments` desde cascade+catálogo; `video-guard.json` → `legacy-layout`), **1c.7** (plan.json).
- (Antes) 1a, 1b núcleo, 2c (frame-carpeta).

**Dependencia honesta:** 1c.6 (borrar `loadGuard`/`GUARD_FILENAME` del engine) requiere reescribir los ~8 callers que construyen SpendGuard (asset-cost-estimator, asset-synthesizer, voice-clone, compile, synth-avatar) para leer de cascade+catálogo — eso vive en los slices 2a (cascade) y 3b (pipeline plan build). Se deja documentado como dependencia; `spendGuardFromDocuments` ya es el nuevo camino.
**1c.8** (docs/procedures zero refs) depende de 1c.6. Slice 1c queda funcionalmente completo excepto la amputación del archivo legacy (1c.6) que se completa en 3b.

**Siguiente:** 2a (scope classes cascade), 2b (language), 2d (character), 2e (components), 3a, 3b, 4, 5, Phase 7. Con permisos (whisper/render/navegador) puedo completar V.3, 3b-3, 3b-4 y botijos-today. Fusión a dev/main al final con verify.js verde.

## Slice 2 — Cascade (PRs 2a–2e)

- [ ] 2a–2e Not started. 2e requires V.5 recorded (done).

## Slice 3a — nn-core `review_gate` (PR 3a-i, 3a-ii)

- [ ] Not started. Parallel to Phases 1–2.

## Slice 3b — Pipeline and review (PRs 3b-1..3b-5)

- [ ] 3b-1..3b-3, 3b-5 Not started.
- [ ] 3b-3 requires V.3; 3b-4 requires V.4.

## Slice 4 — Console (PRs 4a–4d)

- [ ] 4a–4d Not started. 4a requires V.1 and V.2.

## Slice 5 — Procedures (PRs 5a–5b)

- [ ] Not started.

## Phase 7 — Living specs, release, verification, archive

- [ ] Not started. Requires all slices plus botijos-today recreation and full `verify.js`.