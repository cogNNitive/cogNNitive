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

**Status:** tracker `feat/conntent-redesign` verde y empujado (HEAD e787ab15, verify:fast 254/254 tras cada commit). En esta pasada:
- **Slice 2d COMPLETO** (2d.1-2d.5): `lib/characters.mjs` (CHARACTER.md + frontmatter validado, findCharacter, characterValues, characterOverrides warning `character-override` dedup field+source, assertCharacterVoice → `missing-character-voice`), campos `character`/`pose`/`background` render-class (levels derivados de Concepts: densos sin Layer), character node en cascade (`nivel:character:name`, explicit > character > preset, D19).
- **Slice 2e COMPLETO** (2e.1-2e.7): `lib/component-portfolio.mjs` (COMPONENT.md schema completo: variables objects, duration/aspect/source pin/license), 6 componentes a folder form `library/components/<name>/{COMPONENT.md,index.html,preview.mp4}`, contracts a `skills/nn-conntent/slots/<slot>.html`, `resolveLibrary` con components como FOLDER_KIND, `resolveComponents` lee index.html; thumbnail hermético (vendor/gsap.min.js local, sin CDN); V.5 fallback aplicado (6 engine-authored, archivo `local`, sin URLs de red en index.html); manifest del paquete en la sección Structure del spec.
- (Antes) 1a, 1b, 2c, 1c.1-1c.5+1c.7, 2a completo, 2b completo.

**Pendiente:** ninguno de 1a-2e (SLICE 2 COMPLETO: 2a, 2b, 2c, 2d, 2e). **Luego:** 3a (review_gates en nn-core), 3b-1..5 (incluye whisper + renders reales), 4a-4d (consola, navegador), 5a-5b (procedures), Phase 7 (living specs, botijos-today, verify.js full, archive). 1c.6/1c.8 dependientes de 3b (rewire spendGuard callers a cascade+catalog). Con permisos (whisper/render/navegador) puedo completar V.3, 3b-3, 3b-4, 4a (V.1/V.2), botijos-today. Fusión a dev/main al final con verify.js verde.

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