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

**Status:** tracker `feat/conntent-redesign` verde y empujado (HEAD ccec1e5a, verify:fast OK tras cada commit; nn-core changeset 165/165). En esta pasada:
- **Slice 3a-i.1+3a-i.2 (parcial)**: `review_gate` añadido a `CHANGE_OPS`; `ChangeItem` con `gate`/`verdict`/`reviewed_hash`/`plan_hash`/`rawKeys`; frontmatter `author_kind`/`origin`/`reviewer`; `reviewGateProblems()` (shape + keys no declaradas + verdict enum + hash hex64); parser lee las keys y exige los 3 markers cuando hay review_gate; hasher sella verdict keys + provenance (PROPOSAL_KEYS + computeProposalSha(frontmatter)); tests `review-gate.test.ts` 8/8 y `hasher.test.ts` actualizado. Mirror `nn-core.generated.cjs` y console-payload regenerados.
- **Slice 2 COMPLETO** (2a, 2b, 2c, 2d, 2e) — ver abajo.
- (Antes) 1a, 1b, 1c.1-1c.5+1c.7.

**Pendiente:** 3b-1..5 (incluye whisper + renders reales), 4a-4d (consola, navegador), 5a-5b (procedures), Phase 7 (living specs, botijos-today, verify.js full, archive). 1c.6/1c.8 dependientes de 3b (rewire spendGuard callers a cascade+catalog). Permisos ya concedidos: whisper.cpp, gasto proveedor, navegador (V.1/V.2/V.3/V.4/V.5). Fusión a dev/main al final con verify.js verde.

## Slice 2 — Cascade (PRs 2a–2e)

- [x] 2a COMPLETO (resolver único con source-trace, registry scope/levels, contract test, avatar_resolution render cascade).
- [x] 2b COMPLETO (lenguaje/voz, capability video rechazada, campos captions/thumbnail/review_gates, parity estimator/compiler).
- [x] 2c COMPLETO (frame folder).
- [x] 2d COMPLETO (Character folder + node + override warning + missing-character-voice).
- [x] 2e COMPLETO (portfolio folder form, slots contracts, hermetic thumbnail, V.5 fallback, manifest).

## Slice 3a — nn-core `review_gate` (PR 3a-i, 3a-ii)

- [x] 3a-i.1 + 3a-i.2 (op parse/validate/seal + provenance markers).
- [x] 3a-i.3 + 3a-i.4 (blueprint `gates` frontmatter; `parseGateDeclarations`, `gateDeclarationProblems`; GATE_UNDECLARED / GATE_TARGET_INVALID; `gates:` in coNNtent spec_NN.md, blueprint_version → V_0-17-0).
- [x] 3a-i.5 + 3a-i.6 (`reviewGateProvenanceProblems`: GATE_NOT_HUMAN / GATE_REVIEWER_REQUIRED, Q9 default pseudonym; apply engine treats `review_gate` as non-mutating, skips evidence, seals provenance; `review-gate-apply.test.ts` 10/10; nn-core built).
- [x] 3a-ii.1..3 (server handlers refuse `review_gate` with GATE_VERDICT_REFUSED for propose_changeset and bare-intent apply_change; changeset files still apply; `parseFrontmatter` exported through the coNNtent core mirror).
- [x] 3a-ii.4 code-side only; living-spec text lands in 7.1/8.2.
- [x] 3a-ii.5 risk R1 recorded in the `changeset-review-gate` delta spec notes.
- Note: `nn-mcp/test/apply-change.test.ts` is red at tracker HEAD before this slice (its fixture keeps `sources::`, banned on L3 since b998756d); unrelated to review_gate.

### Known pre-existing reds (not caused by Slice 3; block the final full gate)

- `nn-core` full suite: `corpus-address-scan` (1), `corpus-concept-fields-scan` (1),
  `roundtrip-fidelity` (2), `shipped-workspace` (1) — all against `test/_samples_nn`
  corpus/sample content, none touching coNNtent spec code.
- `nn-mcp` `test/apply-change.test.ts` (13) — fixture keeps `sources::`, banned on L3.
- Fixed here: `conntent-storage.test.ts` (pinned V_0-15-2 and `assets/`), `metaschema-selfdescribe`
  (`thumbnail_formats` used `type:: list`; now `select` + `multiple:: true`).

## Slice 3b — Pipeline and review (PRs 3b-1..3b-5)

- [ ] 3b-1..3b-3, 3b-5 Not started.
- [ ] 3b-3 requires V.3 (whisper); 3b-4 requires V.4 (renders).

## Slice 4 — Console (PRs 4a–4d)

- [ ] 4a–4d Not started. 4a requires V.1 and V.2.

## Slice 5 — Procedures (PRs 5a–5b)

- [ ] Not started.

## Phase 7 — Living specs, release, verification, archive

- [ ] Not started. Requires all slices plus botijos-today recreation and full `verify.js`.