# Proposal: Lifecycle Narrative and Dynamic Sources Impact Checking

## Intent

Unify and formalize the core mental model and operational mechanisms of cogNNitive across public communication, documentation, and tooling. The system bridges external raw knowledge (brains + files) into structured semantic models via a 3-phase lifecycle (`IMPORT` -> `MANAGE` -> `EXPORT` + Feedback Loop) with radical provenance and zero vendor lock-in. Additionally, this introduces an automated and on-demand **Impact Check** mechanism for dynamic sources to detect when updated source files invalidate downstream model citations.

## Scope

### In Scope

1. **Product Communication & Narrative Unification**:
   - Refactor `docs/index.md` (landing page), `README.md`, and core architecture docs to present the 3-phase lifecycle:
     - External World: Brains (internal/external) -> Elicitation -> Digital Files/URLs.
     - Phase 1: `IMPORT` (`sources/import/`, `sources/staging/`, `sources/nn/`, `sources/archive/`).
     - Phase 2: `MANAGE` (iNNfo Level 3 Models as SSOT, structured syntax, triple interface: text editors, iNNfo Modeler web app, AI pair-programming agents).
     - Phase 3: `EXPORT` (Role-specific deliverables, dashboards, and closed-loop feedback re-ingestion).
   - Clarify the value pillars: Zero Vendor Lock-in (local plain Markdown), Fine-Grained Section Traceability, AI Pair-Programming with OpenCode/Antigravity/Claude Code.

2. **Dynamic Sources Management & Impact Checking**:
   - Implement change impact detection in `scripts/` (integrated into `scripts/index.js --scan` and standalone `--check-impact` / `--impact`).
   - Compare modified normalized sources against their archived snapshots (`sources/archive/`).
   - Identify every `models/*_NN.md` citing affected section slugs (`sources:: [file.md#heading-slug]`).
   - Generate structured console warnings and diagnostic reports (`export/Impact_Audit_<date>_report.md`) detailing affected model elements and content delta.

3. **Skill & Documentation Alignment**:
   - Update `actioNN/skills/nn-trannsform/SKILL.md` to document the dual execution of Impact Check (automatic on scan + standalone flag).
   - Document the intermediate staging buffer lifecycle (`sources/staging/`) and deliverable feedback loop.

### Out of Scope

- Modifying core iNNfo syntax specification (`# NN`, `## NN`, `key:: value`).
- Implementing automated destructive edits on models without user consent.
- Cloud hosting or server-based synchronization.

## Capabilities

### New Capabilities
- `dynamic-sources-impact-check`: Deterministic audit tool scanning models for citations to changed/removed headings in updated sources, producing diff assessments and remediation reports.

### Modified Capabilities
- `documentation-narrative`: Crystal-clear 3-phase lifecycle and external knowledge elicitation storytelling across docs, website, and README.
- `scanner-source-lifecycle`: Integrated impact warning during `--scan` when an existing source file SHA-256 changes and snapshots are created.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/index.md` | Modified | Updated landing page narrative, 3-phase lifecycle, value pillars |
| `README.md` | Modified | Aligned monorepo overview and mental model |
| `docs/ecosystem/cognitive-ecosystem.md` | Modified/New | Comprehensive ecosystem lifecycle and architectural flow guide |
| `scripts/lib/impact-checker.js` | New | Engine module for comparing source diffs against model `sources::` citations |
| `scripts/index.js` | Modified | Add `--check-impact` flag and hook into `--scan` workflow |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modified | Document dynamic source impact checking and staging conventions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| False positive drift alerts on minor typo fixes in sources | Med | Use normalized heading slug comparison; only alert if heading disappeared or text content changed significantly |
| Performance overhead on large workspaces during `--scan` | Low | Run impact check only on sources that actually changed hash in the current scan run |
| Breaking existing skill conventions | Low | Non-breaking additive flags and non-destructive warnings |

## Rollback Plan

Revert modified documentation files and remove `scripts/lib/impact-checker.js` and associated CLI flags.

## Success Criteria

- [ ] `docs/index.md` and `README.md` articulate the 3-phase lifecycle, external knowledge elicitation, and zero lock-in narrative clearly without jargon or abstract metaphors.
- [ ] `node scripts/index.js --scan` automatically detects modified sources, generates snapshots in `sources/archive/`, and prints impact warnings if cited model elements are affected.
- [ ] `node scripts/index.js --check-impact` runs on-demand across all models and sources, returning a clear status and exit code.
- [ ] All changes adhere to English-only technical artifacts, conventional commits, and single-branch `dev` hygiene.
