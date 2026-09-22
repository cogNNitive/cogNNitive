# Tasks: Skill Channel Freshness Reporting

## How to read this file

Two dependency-ordered slices (design §6). Slice 2 fetches a URL Slice 1 creates, so Slice 1
MUST land first. Both are single self-contained, revertible work-unit commits on `dev`
(`single-dev-branch-workflow`) — not feature branches. Strict TDD applies to Slice 1's
`freshness.js` and Slice 2's `preflight-check.js` changes; CI wiring and the doc-line fix carry
no testable logic and use a named manual falsification instead (design §5, row "CI wiring" /
"doc line").

**Untouched, confirm on every commit:** `generate-manifest.js`, `validate-manifest.js`,
`github-client.js`, `manifest-rules.js`, `manifest/source.yaml`, `lib/yaml-lite.js`,
`build-docs.mjs`, `verify.js`, `atomic-fs.js`, `skills-commands.js`, `ci.yml:56-61`.

---

## Slice 1 — `ci-subsystem-freshness-computation`

**Satisfies:** delta spec `specs/ci-subsystem-freshness-computation/spec.md` (all 4
requirements: per-subsystem drift, `manifest/source.yaml`-pin baseline, local-git-only
computation, self-describing published JSON).

**Commit boundary.** New `scripts/freshness.js` + `scripts/freshness.test.js`,
`ci.yml:21` checkout fix, one new CI step, `.gitignore` line. Nothing else.

### RED

- [x] 1.1 Write `scripts/freshness.test.js` against a not-yet-existing
      `computeFreshness({ sourceYaml, runGit, head })` (pure, injectable git — no real git, no
      network), covering per design §5 / spec scenarios:
  - [x] (a) two subsystems, distinct tags, distinct `commitsSincePin` (no misattribution, spec
        scenarios "skills-only commit" / "iNNfo Suite release not misattributed").
  - [x] (b) unresolvable tag → `commitsSincePin: null` + `unresolved` reason, never `0`, never
        omitted (spec scenario "pinned tag cannot be resolved"; ADR-002).
  - [x] (c) zero commits since pin → subsystem still published with `commitsSincePin: 0`,
        `filesTouched: []` (spec scenario "zero drift reported explicitly").
  - [x] (d) `runGit` throwing for one subsystem → that subsystem `unresolved`, siblings still
        computed (design §5).
  - [x] (e) output key order stable across runs (design §5).
  - [x] (f) baseline resolved from `manifest/source.yaml` `channels.stable.refs`, not from
        sorting tags — a newer unpinned tag must not mask drift (spec scenario "cut-but-unpinned
        tag does not mask drift"; ADR-002).
- [x] 1.2 Run the suite, confirm every case above fails for the right reason (module does not
      exist yet).

### GREEN

- [x] 1.3 Create `scripts/freshness.js`: export pure `computeFreshness({ sourceYaml, runGit,
      head })`. Read `channels.stable.refs` via `parseFocusedYaml` (reuse from
      `scripts/manifest/validate-manifest.js`, no new parser — ADR-002). Hardcode the 4-entry
      `SUBSYSTEM_PATHS` table (`skills/`, `iNNfo/specs/templates/`,
      `iNNfo/packages/innfo-mcp/`, `iNNfo/specs/templates/console/`) with the `ponytail:`
      comment recording the known `templates`/`innfo-console` path overlap (ADR-003).
- [x] 1.4 Per subsystem: `git rev-parse <tag>^{commit}` (catch failure → `unresolved`),
      `git log -1 --format=%cI <tag>` → `pinnedTagDate`,
      `git rev-list --count <tag>..HEAD -- <dirs>` → `commitsSincePin` (never a line count of
      `git log --oneline` — spec requirement "local git only"),
      `git diff --name-only <tag>..HEAD -- <dirs>` → `filesTouched`.
- [x] 1.5 Add the CLI entry: writes `docs/use/freshness.json` via `saveJsonAtomic`
      (`scripts/lib/atomic-fs.js`, ADR-009); on write failure, exit with
      `FAIL: could not write docs/use/freshness.json: <code>`, not a raw stack trace (matches
      `atomic-fs.js:78-83` precedent).
- [x] 1.6 Confirm all 1.1 cases pass.

### Wiring (no test — tautological per design §5)

- [x] 1.7 `.github/workflows/ci.yml:21`: add `with: { fetch-depth: 0 }` to the `verify` job's
      checkout ONLY. Do not touch the `quality`, `spec-integrity`, or `deploy-pages` checkouts
      (ADR-007 — `fetch-tags: true` at depth 1 is explicitly rejected, it miscounts silently).
- [x] 1.8 Add one new step in the `verify` job invoking `node scripts/freshness.js`, placed
      before `Upload built docs` (`ci.yml:66`), gated `if: github.ref == 'refs/heads/main'`,
      with `continue-on-error: true` (design §3 data flow, ADR-007 "never blocking").
- [x] 1.9 Add `docs/use/freshness.json` to `.gitignore`, beside the `docs/innfo/cdn/*.bundle.js`
      precedent (ADR-001 — not committed, CI/Pages-artifact-only).
- [ ] 1.10 Manual falsification (no automated test for CI wiring, design §5): on the next push
      to `main`, confirm the step runs, `docs/use/freshness.json` appears in the `pages-docs`
      artifact, and `https://cognnitive.com/use/freshness.json` resolves. Record the run URL in
      the commit body. **NOT DONE — requires a real push to `main`; not performed in this apply
      run (commit landed on `dev` only).**
- [x] 1.11 Run `npm run lint`, `npm run typecheck`, `npm run verify` — all green.
- [x] 1.12 Commit as one work unit: `feat(ci): publish per-subsystem channel freshness JSON`,
      staged explicitly with
      `git add scripts/freshness.js scripts/freshness.test.js .github/workflows/ci.yml .gitignore`
      — no wildcard staging. Commit `260fb63` on `dev`.

**Rollback.** Revert the single commit; the JSON simply stops updating, Slice 2's fetch degrades
to silent omission (design §6).

**Est. changed lines:** ~170 incl. test (design §6).

---

## Slice 2 — `preflight-freshness-reporting` + `skills-lifecycle-state-file-doc-fix`

**Depends on:** Slice 1 (fetches `docs/use/freshness.json`).

**Satisfies:** delta spec `specs/preflight-freshness-reporting/spec.md` (all 3 requirements:
printed line + tag-match guard, `exitCode` never touched, silent omission on any failure mode)
and `specs/skills-lifecycle-state-file-doc-fix/spec.md` (both requirements).

**Commit boundary.** `preflight-check.js`, `preflight-check.test.js`,
`nn-skills-lifecycle/SKILL.md:48`. Nothing else.

### RED

- [x] 2.1 Write/extend `skills/nn-preflight/scripts/preflight-check.test.js`, covering per
      design §5 / spec scenarios:
  - [x] (a) freshness present, `pinnedTag` matches the manifest's reported tag → line printed,
        `exitCode` unchanged (spec scenario "pinned tag matches the manifest").
  - [x] (b) freshness fetch rejects/times out → no line, no item, no notice, `exitCode`
        unchanged (spec scenario "freshness fetch itself fails or times out" — the case that
        proves the signal cannot block).
  - [x] (c) `pinnedTag` mismatch (stale freshness file) → no line, no warning about the mismatch
        (spec scenario "stale freshness file").
  - [x] (d) malformed JSON → no line, no throw (spec scenario "response lacks expected fields").
  - [x] (e) `commitsSincePin: 0` → no line printed for that subsystem.
  - [x] (f) manifest itself unreachable → freshness fetch never attempted, existing
        `:920-934` behavior unchanged (spec scenario "manifest unreachable, exit code
        unaffected").
- [x] 2.2 Run the suite, confirm each new case fails for the right reason.

### GREEN

- [x] 2.3 Add `FRESHNESS_URL` const pointing at
      `https://cognnitive.com/use/freshness.json` — single URL, no
      `raw.githubusercontent` fallback (ADR-004, the file is not committed so a raw fallback
      would 404 by construction).
- [x] 2.4 After the manifest fetch succeeds, issue one guarded
      `fetchWithTimeout(FRESHNESS_URL, 4000)` call (reuse the existing helper/budget, not
      `fetchString` — ADR-004). Any throw / non-JSON / missing-field response is caught and
      produces no item (ADR-005).
- [x] 2.5 Implement the anti-alarm guard: print only when
      `freshness.subsystems[key].pinnedTag === <ref the manifest just reported>`. Mismatch or
      absent → silently skip that subsystem (ADR-005).
- [x] 2.6 Place the print block with the `templateCatalogOffline` notice at `:1155-1157`,
      **before** both early returns (`:1162` manifest-unreachable, `:1174` status-OK) — placing
      it after either makes the line invisible in the common green case (ADR-005, design §3
      "Placement is load-bearing").
- [x] 2.7 Print exactly the design §3 line format: pin identity, pin age computed at print time
      from `pinnedTagDate` (not `generatedAt`, so phrasing cannot go stale), drift count, and
      the "informational, not a blocker" label. Do not render a stale/fresh verdict (spec
      requirement "reports facts, not a verdict").
- [x] 2.8 Confirm no assignment to `results.status` or `results.exitCode` anywhere in the new
      code path — this absence is asserted by test 2.1(a)/(b) (ADR-005).
- [x] 2.9 Confirm all 2.1 cases pass.

### Doc fix (no test — tautological per design §5)

- [x] 2.10 `skills/nn-skills-lifecycle/SKILL.md:48`: replace
      `~/.agents/skills-state.json` with `~/.agents/bootstrap-state.json`, matching
      `DEFAULT_STATE_FILE` in `preflight-check.js` / `skills-commands.js`. Do not describe
      `skills-state.json` as current — legacy migration source only, if mentioned at all.
- [x] 2.11 Manual falsification: `rg skills-state.json skills/nn-skills-lifecycle/` returns only
      legacy-migration references, none describing it as the current state file.
- [x] 2.12 Run `npm run lint`, `npm run typecheck`, `npm run verify` — all green.
- [x] 2.13 Commit as one work unit: `feat(nn-preflight): report channel freshness informationally`,
      staged explicitly with
      `git add skills/nn-preflight/scripts/preflight-check.js skills/nn-preflight/scripts/preflight-check.test.js skills/nn-skills-lifecycle/SKILL.md`
      — no wildcard staging.

**Rollback.** Revert the single commit; an older installed `preflight-check.js` already degrades
silently against the new/absent data (design §6, spec scenario "older installed script remains
forward-compatible").

**Est. changed lines:** ~90 (design §6).

---

## Non-task — `atomic-state-write-investigation-closed`

**Satisfies:** delta spec `specs/atomic-state-write-investigation-closed/spec.md`. This is a
closed investigation, not implementation work — recorded here so it is not "helpfully" reopened.

- [x] N.1 **Do NOT write any production code** in `scripts/lib/skills-commands.js` or
      `scripts/lib/atomic-fs.js` for atomic/ordered state writes. The existing sequence
      (`replaceDirAtomic`/`copyDirAtomic` → in-memory state mutation → single post-loop
      `saveState`) already prevents the feared failure mode (proposal "Investigated and
      closed"; spec requirement "no production code is added").
- [ ] N.2 (Optional, MAY be skipped) At most one regression unit test asserting the write order
      — state mutated only after the directory swap resolves. No corresponding production code
      change, ever.

---

## Cut from this tasks plan (ponytail)

Per design §7 / §8, excluded because they exist only to satisfy process or were already ruled
out:

- Any scenario writing `pinnedTagDate` / `commitsSincePin` into `docs/use/manifest.md`
  frontmatter — deleted with `generate-manifest.js` untouched (ADR-001).
- Any change to `lib/yaml-lite.js` — verified unnecessary (ADR-006).
- An "unreachable" warning item for the freshness fetch specifically — silent omission is
  correct (ADR-005, §7).
- A user-side staleness threshold on `generatedAt` — the tag-equality guard already covers it
  (ADR-005).
- A `raw.githubusercontent` fallback URL — 404s by construction (ADR-004).
- Widening `parseManifest` to expose mcp/console refs for two extra print lines (ADR-005, §7).
- Deriving `SUBSYSTEM_PATHS` from `source.yaml` entries — reproduces single-file blindness
  (ADR-003).
- Extending `checkTemplateMainCoherence` instead of a new script — wrong question, network-bound
  (ADR-008).
- `fetch-tags: true` instead of `fetch-depth: 0` — miscounts silently on a shallow graft
  (ADR-007).
- A task asserting `ci.yml` contains its own new text — tautological (design §5).

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~260 total (Slice 1 ~170 incl. test, Slice 2 ~90 incl. test) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR, OR two sequential work-unit commits on `dev` (Slice 1 then Slice 2) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `scripts/freshness.js` + CI wiring, publishes `docs/use/freshness.json` | PR 1 (or commit 1 on `dev`) | Standalone value even if unit 2 never ships (design §6) |
| 2 | `preflight-check.js` freshness line + `nn-skills-lifecycle` doc fix | PR 2 (or commit 2 on `dev`) | Depends on unit 1 (fetches its published JSON) |

Both slices are individually well under 400 lines and their combined total (~260) is also under
budget. Per `single-dev-branch-workflow`, each slice ships as one self-contained, independently
revertible work-unit commit on `dev` in the order above — chaining is unnecessary here.
