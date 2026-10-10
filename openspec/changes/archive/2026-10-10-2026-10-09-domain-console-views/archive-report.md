# Archive Report: Domain Console Views (one console, registered views)

**Change**: `2026-10-09-domain-console-views`
**Archived**: 2026-10-10
**Archive path**: `openspec/changes/archive/2026-10-10-2026-10-09-domain-console-views/`
**Artifact store**: openspec
**Verdict inherited from sdd-verify**: PASS WITH WARNINGS — 0 CRITICAL
**Status**: success (user-approved exceptional partial archive)

---

## Archive folder naming decision

The archive convention is `openspec/changes/archive/YYYY-MM-DD-{change-name}/` (openspec-convention.md).

- Today's date: `2026-10-10`; change name already carries its own date: `2026-10-09-domain-console-views`.
- Existing archive entries created on a date later than the change's own date are double-dated, e.g.
  `2026-09-16-2026-09-13-document-fidelity-and-provenance-integrity`,
  `2026-09-16-2026-09-14-unified-model-hierarchy-and-workspace-navigation`,
  `2026-09-30-2026-09-30-mcp-live-model-preview`.

**Chosen**: `2026-10-10-2026-10-09-domain-console-views` (`{archiveDate}-{changeName}`), matching the established double-date form for a date-carrying change archived on a later day.

---

## Task Completion Gate — exceptional reconciliation (orchestrator-approved)

`sdd-verify` returned **PASS WITH WARNINGS, 0 CRITICAL** (`verify-report.md`). The persisted `tasks.md` carried
seven stale unchecked operational/verify boxes whose work is complete per `verify-report.md`,
`apply-progress-s0-s1.md`, `apply-progress-s2.md`, and the release evidence. The orchestrator explicitly
approved the exceptional mechanical reconciliation of these stale checkboxes (a user-approved, non-critical
partial archive). Marked checked:

| Task | Kind | Evidence |
|---|---|---|
| 2a.9 | Verify checkpoint | apply-progress-s0-s1.md / apply-progress-s2.md; verify phase |
| 2b.10 | Verify checkpoint | apply-progress-s2.md; verify phase |
| 2c1.6 | Verify checkpoint | apply-progress-s2.md; verify phase |
| 2c1.8 | Operational release | `innfo-console-v0.9.2` released (release.yml run success 2026-10-10T07:34Z) |
| 2d.10 | Verify checkpoint | apply-progress-s2.md; verify phase |
| 2d.11 | Operational release | templates release `blueprints-v0.25.0` (success 07:37Z) + MCP bundle restage/bump `innfo-mcp-v0.15.1` (success 07:56Z) |
| 2e.6 | Operational release | covered by `blueprints-v0.25.0` |

**Explicitly deferred sub-item**: under `2d.11`, the sub-item *"regenerate the Ghostbusters sample console"*
is **DEFERRED** to a follow-up session. The sample
`iNNfo/specs/bluepriNNts/metrics/samples/Ghostbusters_V_0-1-0_console.html` remains a frozen fixture asserted by
`iNNfo/packages/innfo-core/tests/console-thinning.test.ts`; regenerating it is a separate decision. `tasks.md`
records this with a one-line note on `2d.11`.

After reconciliation, `tasks.md` contains **zero** unchecked boxes.

---

## Delta Spec Sync

Deltas merged from `openspec/changes/2026-10-09-domain-console-views/specs/*/spec.md` into
`openspec/specs/{domain}/spec.md`. Requirements not mentioned in the deltas were preserved.

| Domain | Action | Details |
|---|---|---|
| console-architecture | Updated | 2 modified (Level 2 Template Domain Consoles; Level 3 Model Custom Consoles); Level 1 and Three-Pathway preserved |
| console-hub-onboarding | Updated | 3 removed (Actionable empty state; Editor-native theming of the embedded hub; Single-tier header in embedded mode) — spec now has no requirements |
| console-tabbed-views | Updated | 3 modified (R1; R3; R4); R2, R5, R6 and the Scenario Verification section preserved |
| console-view-registry | Created | New spec copied from the delta; 11 added (registerView contract; Shared mount context; Tabs mounted from the registry; Discovery of bluepriNNt and custom views; Trust model and header listing; Read-only HTML in sandboxed iframes; Standalone view export; Size budget; Duplicate and invalid view ids; Timeline and procedure as first views; Sample custom view) |
| editor-lineage-ui | Updated | 1 modified (Explorer classifies files by contract role), incl. removal of the obsolete ConsoleHubView sentence/scenario; 5 preserved |
| editor-navigation | Updated | 3 modified (Sidebar…; Workspace View Controls in Header; Tree Node Selection Reactivity…) |
| innfo-console-feedback | Updated | 1 modified (Feedback JSON Schema; filename-from-slug + hashed-slug scenarios added); 1 added (Live draft count); Export Modal, Reconcile Feedback Procedure, Normalized Feedback Anchors preserved |
| innfo-console-runtime | Updated | 2 modified (No Duplicated Inline Runtime; Bundle-Injected Feedback UI); 1 removed (Exclude Internal Specs and Workspace Root from Model Console Tabs); 6 preserved |
| innfo-skill-menu | Updated | 1 modified (Canonical Entry Menu Structure); 2 preserved |
| metrics-console-adoption | Updated | 5 modified (Activation Gate Before Thinning; Thinned Console Artifact Shape; Console Generation Procedure; Timeline Rename (artifact only); Harness and Sample Verification); Series-as-Data, Shared Console Charts, Code-as-Slot preserved |
| nn-naming-contract | Updated | 1 modified (Procedure file names); 11 preserved |
| template-procedures-manifest-and-discovery | Updated | 1 modified (R-TPD-02); R-TPD-01/03/04/05/06 preserved |
| workspace-hub-prompt | Updated | 4 removed (Header Action Button; Prompt Generation Modal; Dynamic Prompt Content Contract; Offline & file:// Hygiene) — spec now has no requirements |

**Totals**: 20 requirements modified/replaced · 12 added · 8 removed.

### Structural note
`console-tabbed-views` and `template-procedures-manifest-and-discovery` use legacy heading styles
(`#### R{n}:` and `### R-TPD-{nn}:`). The merge preserved each document's existing heading convention
(the delta's `### Requirement:` prefix was mapped onto the local style) so heading hierarchy stays valid.
This is pre-existing document debt, not introduced by this archive.

---

## Integrity Verification (no truncation)

Requirement counts before → after, and line counts before → after. Every requirement not named by a delta
is still present.

| Domain | Reqs before | Reqs after | Lines before | Lines after | Expected |
|---|---|---|---|---|---|
| console-architecture | 4 | 4 | 64 | 75 | 2 replaced |
| console-hub-onboarding | 3 | 0 | 53 | 5 | 3 removed |
| console-tabbed-views | 6 (R-style) | 6 (R-style) | 50 | 61 | 3 replaced |
| console-view-registry | — | 11 | — | 150 | new |
| editor-lineage-ui | 6 | 6 | 82 | 78 | 1 replaced |
| editor-navigation | 3 | 3 | 70 | 65 | 3 replaced |
| innfo-console-feedback | 4 | 5 | 122 | 151 | 1 replaced + 1 added |
| innfo-console-runtime | 9 | 8 | 193 | 178 | 2 replaced + 1 removed |
| innfo-skill-menu | 3 | 3 | 48 | 50 | 1 replaced |
| metrics-console-adoption | 8 | 8 | 129 | 153 | 5 replaced |
| nn-naming-contract | 12 | 12 | 226 | 227 | 1 replaced |
| template-procedures-manifest-and-discovery | 6 (R-TPD) | 6 (R-TPD) | 93 | 93 | 1 replaced |
| workspace-hub-prompt | 4 | 0 | 72 | 7 | 4 removed |

Deltas for the emptied `console-hub-onboarding` and `workspace-hub-prompt` specs removed exactly their named
requirements (3 and 4); the files retain title + Purpose + `## Requirements`. No canonical spec was truncated.

---

## Archive Verification Checklist

- [x] Main specs updated correctly (delta merge complete; untouched requirements preserved)
- [x] Change folder moved to `openspec/changes/archive/2026-10-10-2026-10-09-domain-console-views/`
- [x] Archive contains all artifacts (proposal.md, specs/ (13 domains), design.md, tasks.md, verify-report.md, apply-progress-s0-s1.md, apply-progress-s2.md, handoff.md)
- [x] Archived `tasks.md` has no unchecked implementation tasks (stale-checkbox reconciliation approved by the orchestrator and backed by verify-report/apply-progress/release evidence)
- [x] Active changes directory no longer contains the change
- [x] No CRITICAL issues in `verify-report.md` (0 CRITICAL; PASS WITH WARNINGS)

## Intentional-with-Warnings Records

- **Stale-checkbox reconciliation**: approved by the orchestrator; see the gate table above.
- **Deferred sub-item**: `2d.11` Ghostbusters sample console regeneration — follow-up session.
- **Inherited warnings** (non-blocking, unchanged): 4 scenarios without runtime coverage; jsdom-only readonly-iframe isolation evidence; non-canonical TDD progress format; environmental Docs-Derived Facts drift.

---

**Status**: success
**Summary**: Synced 13 delta specs into canonical specs (20 modified, 12 added, 8 removed) and archived `2026-10-09-domain-console-views` to `openspec/changes/archive/2026-10-10-2026-10-09-domain-console-views/`. Exceptional orchestrator-approved reconciliation marked 7 stale tasks complete; Ghostbusters sample regeneration deferred.
**Artifacts**: `openspec/changes/archive/2026-10-10-2026-10-09-domain-console-views/archive-report.md`
**Next**: none — SDD cycle complete
**Risks**: Deferred Ghostbusters sample regeneration (`2d.11` sub-item)
**Skill Resolution**: paths-injected — `sdd-archive/SKILL.md`, `_shared/sdd-phase-common.md`, `_shared/openspec-convention.md`
