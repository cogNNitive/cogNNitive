# PENDING — videoscript-vus-export (post-verify)

> Status at end of SDD session: verify verdict **FAIL (expected, no content defects)**.
> Nothing was staged, committed, or pushed by the agent session. All change files are
> uncommitted in the working tree (see "Change footprint" below).
> Push/merge is owner-managed in a separate conversation.

## Change footprint (uncommitted, ours)

- `openspec/changes/videoscript-vus-export/` — proposal.md, specs/videoscript/spec.md,
  design.md, tasks.md, exploration.md, PENDING.md (this file)
- `iNNfo/specs/templates/videoscript/` — spec_NN.md (L2), samples/Ghostbusters L3,
  procedures/generate_VUS_NN.md, exploration/rock-bands-fixture_NN.md

## GREEN already (evidence in verify report)

- `validate_template` on L2 spec_NN.md — valid
- `validate_model` on procedures/generate_VUS_NN.md — valid
- Zero source diff under `iNNfo/packages/innfo-core` and `innfo-mcp/src|tests`
- Hand-simulated VUS byte-compatibility (confirmed-9-only, `//ANYDEO_SPEC` first, LF)

## Remaining work (ordered)

1. **Task 1.1 — DONE 2026-09-09.** Oracle pin recorded in `design.md` Open Questions
   (VidGeNN @ `036f5667`, grammar-over-JSON). Rock-bands quarantine confirmed.
2. **Tasks 1.2 + 4.3 — DONE 2026-09-09 (round-trip GREEN).** Ghostbusters sample →
   VUS artifact → pinned `ScriptParser.parse()`: **0 errors, 0 warnings**,
   1 section / 2 scenes / 4 layers survive with all names. First run caught 6 real
   divergences (invented `layer_generation_text`, non-catalog `scene_voice` values);
   corrected to oracle-canonical `layer_generation_subject` + catalog voices
   (`Friendly_Person`, `Casual_Guy`) across L2, L3 sample, fixture, procedure, spec.
   `validate_template` re-run after rename: GREEN. Zero core/MCP source diff holds.
3. **Task 3.1 — STILL BLOCKED**: regen `catalog.json` + mirror via script only, after concurrent
   dirty files land (`docs/innfo/templates/catalog.json`, `docs/innfo/cdn/manifest.json`,
   `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`, metrics template files).
   Never hand-edit catalogs — run the catalog script, then mirror.
   Expected side effect: `shipped-template-versions.test.ts` goes GREEN
   (it already discovers the `videoscript` slug and fails until registration).
4. **Tasks 4.1/4.2/4.4 — Re-verify after 3.1:** `template-catalog.mjs --check` clean,
   sample `validate_model` parent-resolution GREEN, `nn-template-audit` checklist,
   scoped lint/typecheck/test.
5. **sdd-archive** — only after all tasks are `[x]` and verify verdict is PASS.
6. **VidGeNN side (separate repo, separate conversation):** optional frontmatter-tolerant
   import or plain-VUS intake of the generated artifact; E2E render check.

## Warnings for the push/merge conversation

- `dev` is ahead of `origin/dev` with commits NOT from this change
  (validator-robustness, innfo-mcp, innfo-core). Pushing will include them.
- Foreign dirty/deleted files (`temp/*`, metrics, docs mirrors) are NOT part of this
  change — do not stage them with it. Stage only the two `??` paths above.
- `prettier --check` warns on the 4 new files, but baseline committed templates warn
  identically (pre-existing repo-wide condition, not a regression — do not gate on it).
- Minor cleanups noted (non-blocking): `spec_NN.md` duplicated `layer_level` in one
  Description; Objectives cites `iNNfo_V_0-2-0` while frontmatter parents `V_0-2-1`.

## Findings for the VidGeNN-side conversation (upstream, not ours to fix here)

- `packages/core/specs/V_0-3-3.json` contains duplicate keys (`scene_video_recording`
  ×2, `scene_sources` ×2) — one definition silently wins; data-quality issue in their spec.
- `scene_voice` accepts only catalog values (e.g. `Friendly_Person`, `Casual_Guy`);
  invented narrator names fail validation — our template now uses catalog voices.
- Canonical image-prompt key is `layer_generation_subject` (not `layer_generation_text`,
  which exists in no spec version) — our template corrected accordingly.
