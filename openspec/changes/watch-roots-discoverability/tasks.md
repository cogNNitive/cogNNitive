# Tasks: Watch-Roots Discoverability

Delivery: single light-lane PR (skill text + one preflight script + regenerated docs). No release/version bump.

Review workload forecast: ~120-180 changed lines hand-written; Medium-low 400-line risk. No chained PRs needed.

## 1. Probe signal — `watch_roots.declared`

- [x] 1.1 [RED] Add a `domain-probe` test asserting `watch_roots.declared` is `2` for a record declaring two roots, `0` for a record with no block, `0` for a workspace with no record, and tolerant of CRLF and quoted `Root` values. Run `node --test skills/nn-preflight/scripts/domain-probe.test.js`.
- [x] 1.2 [GREEN] Extend `skills/nn-preflight/scripts/domain-probe.js` to read the lineage record (`kNNowledge/` first, then workspace root; tokens `cogNNitive`/`domaiNN`/`workspace`) and count `## NN External Watch Roots:` entries with a tolerant regex. Add `watch_roots: { declared }` to the JSON output. Do NOT invoke `nn-sources`; keep the probe offline.
- [x] 1.3 [GREEN] Extend the probe's human-readable output with a `Watch roots: <n>` line.
- [x] 1.4 [VERIFY] `node --test skills/nn-preflight/scripts/domain-probe.test.js` green; `node skills/nn-preflight/scripts/domain-probe.js --workspace-dir . --json` prints `watch_roots.declared`.

## 2. Router surfacing — `nn`

- [x] 2.1 [RED] Add a menu-copy test asserting `skills/nn/SKILL.md` documents: the contextual `[s] Sources` sub-option gated on `watch_roots.declared`, the "declare a root" fallback when `declared === 0`, the `[h] Help` watched-folders entry, and the session-start `--watch-digest` invocation gated on `declared > 0`. Include a planted-red case. Run `node --test skills/nn/skill-menu.test.js`.
- [x] 2.2 [GREEN] Edit `skills/nn/SKILL.md` §2 (Job Loop Navigation Menu): add the contextual `[s] Sources` sub-option and the `[h] Help` capabilities entry, preserving the `[s][m][r][p][h][x]` shape and the `(Recommended)` logic.
- [x] 2.3 [GREEN] Edit `skills/nn/SKILL.md` §1/§2 to invoke `node skills/nn-sources/scripts/index.js --watch-digest` after the activation gate when `watch_roots.declared > 0`, with a non-fatal failure rule.
- [x] 2.4 [VERIFY] `node --test skills/nn/skill-menu.test.js` green; `node scripts/verify.js --only=skill` green.

## 3. `nn-innfo` alignment

- [x] 3.1 [GREEN] Update `skills/nn-innfo/SKILL.md` §15 to reference the shared digest/surfacing contract (session-start digest via `nn`; pre-authoring scan unchanged) instead of implying the digest is `nn`-owned but unspecified.
- [x] 3.2 [VERIFY] No `innfo-mcp`/retired-path drift introduced; `node scripts/check-spec-version.mjs` unaffected.

## 4. Docs and derived copy

- [x] 4.1 [GREEN] Regenerate derived docs/manifest copy that mirrors the `nn` menu (`scripts/build-docs.mjs`, `scripts/generate-docs-facts.mjs`); never hand-edit generated files.
- [x] 4.2 [GREEN] Add a short "how to find it" cross-link in `docs/innfo/documentation/import-modes.md` §2 pointing at the `[s] Sources` sub-option and the `[h] Help` entry.
- [x] 4.3 [VERIFY] `node scripts/verify.js` green (includes freshness/drift guards for generated docs).

## 5. Acceptance

- [x] 5.1 `node scripts/verify.js` and CI green.
- [x] 5.2 On a fixture workspace declaring a watch root, `nn` shows the `[s] Sources` scan sub-option and offers the session-start digest.
- [x] 5.3 On a workspace with no roots, the menu is unchanged and no digest subprocess runs.
- [x] 5.4 `openspec validate watch-roots-discoverability --strict` passes.
