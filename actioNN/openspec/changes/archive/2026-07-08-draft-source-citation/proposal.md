# Proposal: Draft Source Citation

## Intent

Add structured, machine-readable source citations to draft documents and a richer final-document flow with citation format selection. Currently, drafts use free-form text like `— Source: IF Narrative GV22BO-1, section IOE.1` with no machine-readable pointer, and the final-document question is a binary yes/no for references.

## Scope

### In Scope
- HTML comment syntax for machine-readable citations in drafts: `<!-- cite: src-001, section IOE.1 -->`
- Visible text preserved alongside HTML comment: `— Source: IF Narrative GV22BO-1, section IOE.1`
- 3-option final document flow replacing binary question (include sources, review draft first, cancel)
- Citation format selection: Sencillo (Recommended), APA, MLA, Chicago, IEEE, Vancouver, BibTeX
- SKILL.md modifications: §3c, §4, §3d — citation syntax, question flow, format selection
- Optional scanner.js update for source-to-ID mapping generation

### Out of Scope
- No separate `_sources.md` file
- No CSL or Citation.js integration
- No full academic citation format enforcement (agent adapts per source type)
- No changes to any other skill

## Capabilities

### New Capabilities
- `document-citations`: structured citation syntax (HTML comment + visible text), 3-option final document flow, and citation format selection for innv0-trannsform document output

### Modified Capabilities
- None — no existing spec covers innv0-trannsform output behavior

## Approach

1. **Update §4 (draft format)**: Require HTML comment `<!-- cite: src-NNN, section ... -->` alongside existing visible source text in every citation. Define `src-NNN` as a pointer to a source file relative to the workspace.
2. **Update §3c (version type question)**: Replace binary "include references?" with 3-option decision: **[A]** Include sources inline (Recommended), **[B]** Review draft first (user edits → choose format), **[C]** No sources (strip all citations), **[X]** Cancel.
3. **Add citation format sub-flow**: After options A or B, present format choice: **[A]** Sencillo (Recommended), **[B]** APA, **[C]** MLA, **[D]** Chicago, **[E]** IEEE, **[F]** Vancouver, **[G]** BibTeX export, **[X]** Back.
4. **Update §3d (transformation)**: Reference the citation flow: draft mode always adds HTML comments + visible text; final mode applies chosen format or strips citations.
5. **scanner.js** (optional): Extend `generateSourceFrontmatter` or add a helper to emit a source-path-to-ID mapping consumable by the `src-NNN` pointer syntax.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/innv0-trannsform/SKILL.md` | Modified | §3c, §4, §3d — citation syntax, question flow, format selection |
| `skills/innv0-trannsform/scripts/scanner.js` | Optional | Source-to-ID mapping generation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Citation format accuracy depends on agent LLM | Med | Document format rules clearly in SKILL.md; agent adapts per run |
| 7 formats may overwhelm users | Low | Sencillo marked Recommended; selection is after primary decision |

## Rollback Plan

Revert `skills/innv0-trannsform/SKILL.md` to previous git state. No data migration needed — no new files or schemas introduced.

## Dependencies

- None — pure SKILL.md and scanner.js changes, no new npm packages or external services

## Success Criteria

- [ ] Draft documents include `<!-- cite: src-NNN, ... -->` HTML comment + visible source text per claim
- [ ] Final document flow offers 3 options (include-sources / review-first / no-sources) instead of binary
- [ ] Citation format selection produces correct output per chosen style
- [ ] BibTeX option exports a valid `.bib` file
- [ ] scanner.js optionally generates source-to-ID mapping for `src-NNN` pointers
