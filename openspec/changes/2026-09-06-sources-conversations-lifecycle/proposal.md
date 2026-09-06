# Proposal: Workspace Sources and Conversations Lifecycle

## Intent

Restructure workspace directories and establish a first-class source lifecycle:
1. Rename `sources/original/` → `sources/import/` (external raw inputs).
2. Rename `artifacts/` → `export/` (generated deliverables).
3. Introduce root `conversations/` for full interaction transcripts.
4. Symmetric promotion: `export/` → `sources/export/` (`is_synthetic: true`) and `conversations/` → `sources/conversations/` for normalization into `sources/nn/`.
5. Silent reservation, post-session title suggestions with trivial discard, and interactive normalization prompt (full vs summary).
6. Upgrade preflight audit to check all sources (`import/`, `conversations/`, `export/`) against `sources/nn/`.
7. Deprecate legacy Slack/Teams JSON parsing in `scanner-converters.js` for canonical conversation ingestion.

## Scope

### In Scope
- Directory updates: `sources/original/` → `sources/import/`, `artifacts/` → `export/`.
- Session lifecycle: silent reservation (`conversations/YYYY-MM-DD_HHmmss.md`), trivial discard (<2 turns, no mutations), title suggestions (3 options or manual slug).
- Promotion: copy transcripts to `sources/conversations/` (`_source.md`/`_summary.md`) and exports to `sources/export/` (`is_synthetic: true`).
- Generic integrity audit: verify all three source trees against `sources/nn/`.
- Replace Slack/Teams JSON parser in `scanner-converters.js`.

### Out of Scope
- Level-2 spec `cogNNitive_V_0-2-0` modifications (concept remains `Artifacts`; folder is `export/`).
- Real-time disk streaming during chat.

## Capabilities

### New Capabilities
- `conversations-lifecycle`: Session reservation, discard filtering, title suggestion, and transcript promotion.
- `generic-source-integrity-audit`: Universal preflight audit detecting unnormalized sources across import, export, and conversations.

### Modified Capabilities
- `workspace-directory-conventions`: Adoption of `sources/import/`, `export/`, and sub-sources `sources/export/`, `sources/conversations/`.
- `source-normalization-pipeline`: Transcript normalization (`_source.md`/`_summary.md`), synthetic deliverable ingestion, Slack/Teams parser removal.

## Approach
1. **Conventions & Converters**: Update paths in `nn-trannsform`, replace Slack/Teams parser in `scanner-converters.js`, and generalize `preflight-check.js`.
2. **Lifecycle & Promotion**: Add reservation/completion hooks in skills, prompting title selection and normalization modes (`_source.md`/`_summary.md`).
3. **Lineage & Docs**: Wire symmetric export promotion (`is_synthetic: true`); update docs.

## Affected Areas
- `actioNN/skills/nn-trannsform`: Paths, `scanner-converters.js`, lineage model.
- `actioNN/skills/nn-preflight`: Universal source integrity checks.
- `actioNN/skills/nn-router` & skills: Lifecycle hooks.
- `docs/` & `iNNfo/`: References to `sources/original/` and `artifacts/`.

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| Workspace path breakages | Medium | Support fallback alias resolution. |
| Transcript clutter | Medium | Discard sessions with <2 turns and no mutations. |
| Spec immutability violation | Low | Keep concept `Artifacts` in `cogNNitive_V_0-2-0`. |

## Rollback Plan
Revert folder mappings in skills and scripts back to `sources/original/` and `artifacts/`. Saved conversations remain inert markdown files.

## Success Criteria
- [ ] Directories conform to `sources/import/`, `export/`, and `conversations/`.
- [ ] Trivial sessions discarded; non-trivial prompt for title and promotion.
- [ ] Transcripts and deliverables normalize into `sources/nn/` with metadata.
- [ ] Preflight detects unnormalized sources across all source trees.
- [ ] `cogNNitive_V_0-2-0` untouched; `npm run verify` passes.
