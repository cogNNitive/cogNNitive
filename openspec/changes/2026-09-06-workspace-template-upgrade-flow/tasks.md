# Tasks: Workspace Template Upgrade Flow (2026-09-06)

TDD strict — each script ships with its `.test.js` / `.test.mjs` (plain `node`, matching
the existing `preflight-check.test.js` convention).

Gate per component: its `.test.js` green + the existing `preflight-check.test.js` suite
stays green.

---

## 1. Template catalog generator

- [ ] `scripts/template-catalog.test.mjs` — fixture specs tree → catalog JSON shape
      (versions, `adopted` = highest); `--check` exits `1` with drift report on stale
      committed file, `0` when fresh.
- [ ] `scripts/template-catalog.mjs` — walk `iNNfo/specs/templates/`, parse frontmatter,
      group by name, pick `adopted`, write `catalog.json`; `--check` mode.
- [ ] Run generator; commit `iNNfo/specs/templates/catalog.json`.

## 2. Tier-3 upgrade detection (`nn-preflight`)

- [ ] `upgrade-check.test.js` —
  - [ ] `gapKind('V_0-1-0','V_0-2-0') === 'minor'`, major/minor/patch/same cases.
  - [ ] `scanWorkspaceUpgrades` classification: current / upgrade-available (with gap) /
        ahead / unlisted; model discovery filters non-L3 files and skips
        `node_modules/`, `.git/`.
  - [ ] offline catalog → `offline` notice, no classification.
- [ ] `upgrade-check.js` — `gapKind`, model discovery, `scanWorkspaceUpgrades`, catalog
      resolution (workspace → bundled → remote raw), informational item shape.
- [ ] Extend `preflight-check.test.js` — workspace with an upgrade-available model →
      exit stays `0`, `summary.upgrades*` populated, item type `workspace-upgrade`.
- [ ] `preflight-check.js` — import `upgrade-check`, run Tier-3 when `--workspace-dir`
      set, fold into summary + informational items, no exit-code impact.
- [ ] `nn-preflight/SKILL.md` — add Tier 3 section (description + role + report format
      mention).

## 3. `nn-upgrade` skill

- [ ] `backup-workspace.test.js` — copies `models/`, `specs/`, `sources/nn/`,
      `procedures/`, `index.md` to a sibling `*-backup-<ts>/`; missing dirs skipped;
      outside-the-workspace enforced.
- [ ] `backup-workspace.js` — timestamped sibling backup, dry-run, JSON report.
- [ ] `actioNN/skills/nn-upgrade/SKILL.md` — activation gate (delegates to nn-preflight),
      Tier-3 detect → consent → backup → impact → migrate → confirm flow, mapping-question
      rule (only for removed/renamed/re-typed used definitions), unlisted-specialization
      handling.
- [ ] `docs/actionn/documentation/skills/nn-upgrade.md` — skill page (frontmatter +
      summary), consistent with existing skill pages.

## 4. Docs + backlog + manifests

- [ ] `docs/actionn/documentation/skills/nn-preflight.md` — note Tier 3.
- [ ] `openspec/backlog.md` — add detailed item for local-specialization migrations
      (deferred).
- [ ] Bump `nn-preflight` SKILL.md version label to `V_0-1-2` + sync the
      `docs/use/manifest.md` preflight `version` label (commit pin stays — release flow).

## 5. Verify

- [ ] `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js` green.
- [ ] `node actioNN/skills/nn-preflight/scripts/upgrade-check.test.js` green.
- [ ] `node actioNN/skills/nn-upgrade/scripts/backup-workspace.test.js` green.
- [ ] `node scripts/template-catalog.mjs --check` exits `0` (drift gate).
- [ ] `npm --prefix iNNfo run typecheck` green (no engine changes, but confirm no
      regressions).
- [ ] Write `verify-report.md`.