# Imported Issues — Traceability Ledger

Append-only log of issues imported from the public intake (`cogNNitive/cogNNitive-web`)
into the source-of-truth engineering tracker (`cogNNitive/cogNNitive`).

- One row per transfer, **newest last**.
- The authoritative record is GitHub's `transferred` timeline event on each destination
  issue; this ledger is the human-readable index.
- Corrections are new rows, never edits to history.
- See `SKILL.md` §4 (import protocol) and §6 (ledger rules).

| cogNNitive# | web# | title | imported (UTC) |
|-------------|------|-------|----------------|
| 229 | 8 | bluepriNNts/workspace/ ships procedures but no spec_NN.md — workspace procedures are undiscoverable | 2026-10-20 |
| 231 | 1 | Console export broken: missing console-payload.generated.cjs (+ no builder) in console-assets | 2026-10-20 |
| 232 | 2 | Bootstrap body still emits legacy 'workspace' language (frontmatter already canonical) | 2026-10-20 |
| 233 | 3 | skills-manager default manifest URL is a 404 out-of-the-box (points to private cogNNitive/cogNNitive) | 2026-10-20 |
| 234 | 4 | Stale legacy blueprint copies in <workspace>/specs poison validate_knowledge and the app's legacy warning | 2026-10-20 |
| 235 | 5 | visual-import: scanner still blocks images; SOP + visual-catalog not reconciled | 2026-10-20 |
| 236 | 6 | nn-skills-lifecycle ships only SKILL.md; its documented 'node scripts/skills-manager.js' is unavailable to installers | 2026-10-20 |
| 237 | 7 | Console: Matrices tab renders 0x0 (grid not painted) and Evidence images are never displayed | 2026-10-20 |
| 238 | 9 | TTS: offline synthetic branch has no visible warning; external WaveSpeed catalog gap | 2026-10-20 |
| 239 | 10 | Artifact viewer serves HTML via blob: URL, breaking all relative asset paths (embedded and Open External) | 2026-10-20 |
| 240 | 11 | feat(video-engine): per-scene Remotion render still single-pass (estimator guard fixed) | 2026-10-20 |
| 241 | 12 | preflight: false-positive composition blocker on reserved target Markers (item-markers matrix) | 2026-10-20 |
| 242 | 13 | Changeset DX: PROPOSAL_TAMPERED has no documented recovery path | 2026-10-20 |
| 243 | 14 | Console review tab: stale draft whose proposed value equals current value should read 'already applied' | 2026-10-20 |
| 244 | 15 | changes blueprint: document rename_element cascade (hint already shipped) | 2026-10-20 |
| 245 | 16 | Design: matrix-cell drafts end-to-end (custom views -> Changes -> apply) | 2026-10-20 |
| 246 | 17 | innfo-mcp sync_domain_manifest emits legacy '# NN Models' inventory instead of the canonical domaiNN '# NN kNNowledge' | 2026-10-20 |
| 247 | 18 | innfo-mcp Level-2 blueprint authoring corrupts files: add_field block malformed; bump_version silently drops unknown frontmatter keys | 2026-10-20 |
| 561 | 22 | init_knowledge scaffolds a compact document for concepts the blueprint declares distributed (coNNtent Series/Video), and no operation can reach the declared layout | 2026-11-06 |
| 562 | 23 | produce: asset-cost-estimator never passes scriptDir to the scene compiler, so every declared Scene Kind is rejected (available: Libre) | 2026-11-06 |
| 563 | 24 | add_model for a distributed concept (Series) silently falls back to a compact document when its placement folder is absent, and the container is then rejected as CONTAINER_MISSING | 2026-11-06 |
| 564 | 25 | add_model does not stamp blueprint_version, so produce refuses the coNNtent episode that add_model just created | 2026-11-06 |
| 565 | 26 | Episode layout drift: the engine writes series/\<s\>/assets/\<slug\>/ while conntent-folder-contract declares series/\<s\>/episodes/\<slug\>/, and produce.modelIdOf drops the series container outside assets/ | 2026-11-06 |

Notes on the 2026-10-20 sweep:

- All 18 open web issues were maintainer-authored and imported; the web tracker was left
  empty (**0 issues**), its Issues feature nominally still enabled as the public intake.
- 10 of them (`web#1,3,4,6,7,12,13,14,16,18`) had been **closed as already-fixed** in the
  sweep before the transfer; they appear here because the whole tracker was consolidated.
- `web#10` is a **web-only / wrong-product** issue (the iNNfo Modeler app, now retired,
  is not in this monorepo) — imported as a pointer, re-file it against the app repo when one
  exists.
