# Tasks: Workspace Template Upgrade Flow (2026-09-06)

TDD strict — each script ships with its `.test.js` / `.test.mjs` (plain `node`, matching
the existing `preflight-check.test.js` convention).

Gate per component: its `.test.js` green + the existing `preflight-check.test.js` suite
stays green.

---

## 1. Template catalog generator

- [x] `scripts/template-catalog.test.mjs` — fixture specs tree → catalog JSON shape
      (versions, `adopted` = highest); `--check` exits `1` with drift report on stale
      committed file, `0` when fresh.
- [x] `scripts/template-catalog.mjs` — walk `iNNfo/specs/templates/`, parse frontmatter,
      group by name, pick `adopted`, write `catalog.json`; `--check` mode.
- [x] Run generator; commit `iNNfo/specs/templates/catalog.json`.

## 2. Tier-3 upgrade detection (`nn-preflight`)

- [x] `upgrade-check.test.js` —
  - [x] `gapKind('V_0-1-0','V_0-2-0') === 'minor'`, major/minor/patch/same cases.
  - [x] `scanWorkspaceUpgrades` classification: current / upgrade-available (with gap) /
        ahead / unlisted; model discovery filters non-L3 files and skips
        `node_modules/`, `.git/`.
  - [x] offline catalog → `offline` notice, no classification.
- [x] `upgrade-check.js` — `gapKind`, model discovery, `scanWorkspaceUpgrades`, catalog
      resolution (workspace → bundled → remote raw), informational item shape.
- [x] Extend `preflight-check.test.js` — workspace with an upgrade-available model →
      exit stays `0`, `summary.upgrades*` populated, item type `workspace-upgrade`.
- [x] `preflight-check.js` — import `upgrade-check`, run Tier-3 when `--workspace-dir`
      set, fold into summary + informational items, no exit-code impact.
- [x] `nn-preflight/SKILL.md` — add Tier 3 section (description + role + report format
      mention).

## 3. `nn-upgrade` skill

- [x] `backup-workspace.test.js` — copies `models/`, `specs/`, `sources/nn/`,
      `procedures/`, `index.md` to a sibling `*-backup-<ts>/`; missing dirs skipped;
      outside-the-workspace enforced.
- [x] `backup-workspace.js` — timestamped sibling backup, dry-run, JSON report.
- [x] `actioNN/skills/nn-upgrade/SKILL.md` — activation gate (delegates to nn-preflight),
      Tier-3 detect → consent → backup → impact → migrate → confirm flow, mapping-question
      rule (only for removed/renamed/re-typed used definitions), unlisted-specialization
      handling.
- [x] `docs/actionn/documentation/skills/nn-upgrade.md` — skill page (frontmatter +
      summary), consistent with existing skill pages.

## 4. Docs + backlog + manifests

- [x] `docs/actionn/documentation/skills/nn-preflight.md` — note Tier 3.
- [x] `openspec/backlog.md` — add detailed item for local-specialization migrations
      (deferred).
- [x] Keep `nn-preflight` SKILL.md version at `V_0-1-1` (Tier 3 content ships under it).
      The `V_0-1-2` label bump is deferred to the release flow that cuts `skills-v1.2.0`:
      bumping the label standalone fails `check-parity`/`validate-manifest` against the
      pinned `skills-v1.1.5` ref. Same treatment `nn-innfo` got in `e0c62e3`.

## 5. Verify

- [x] `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js` green.
- [x] `node actioNN/skills/nn-preflight/scripts/upgrade-check.test.js` green.
- [x] `node actioNN/skills/nn-upgrade/scripts/backup-workspace.test.js` green.
- [x] `node scripts/template-catalog.mjs --check` exits `0` (drift gate).
- [x] `npm --prefix iNNfo run typecheck` green (no engine changes, but confirm no
      regressions).
- [x] Write `verify-report.md`.