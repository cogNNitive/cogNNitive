# Tasks: Draft Source Citation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 130–150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Citation Syntax & Format Prompts (§4)

- [ ] 1.1 Bump frontmatter version `1.1` → `1.2` in `skills/innv0-trannsform/SKILL.md`
- [ ] 1.2 Add HTML comment mandate: "Every citation MUST include `<!-- cite: src-NNN, section ... -->` immediately before the visible text" at §4, after line 149 intro — `skills/innv0-trannsform/SKILL.md`
- [ ] 1.3 Replace source file name references with `src-NNN` pointer system + dual-output example (HTML comment + visible text) at §4 lines 161–171 — `skills/innv0-trannsform/SKILL.md`
- [ ] 1.4 Append 7 citation format prompt blocks (Sencillo, APA, MLA, Chicago, IEEE, Vancouver, BibTeX) with BibTeX template string after §4 line 203 — `skills/innv0-trannsform/SKILL.md`

## Phase 2: Final Document Question Flow (§3c, §3d)

- [ ] 2.1 Replace binary "include references?" on final path with 3-option flow ([a] include sources, [b] review first, [c] no sources, [x] cancel) at §3c line 133 — `skills/innv0-trannsform/SKILL.md`
- [ ] 2.2 Add `#### 3c-i. Citation format selection` subsection after §3c with 7-format choice table (Sencillo, APA, MLA, Chicago, IEEE, Vancouver, BibTeX, Back) — `skills/innv0-trannsform/SKILL.md`
- [ ] 2.3 Add citation behavior step to §3d: if [a] or [b] apply format from §3c-i; if [c] strip all citations — `skills/innv0-trannsform/SKILL.md`

## Phase 3: Scanner.js Enhancement (Optional)

- [ ] 3.1 Add exported `generateSourceRegistry(mdDir)` function — scans `md/*.md` frontmatter `source.file`, returns `[{id: "src-NNN", path}]` — `skills/innv0-trannsform/scripts/scanner.js`
- [ ] 3.2 Export `generateSourceRegistry` in `module.exports` — `skills/innv0-trannsform/scripts/scanner.js`

## Phase 4: Verification

- [ ] 4.1 Read final SKILL.md — confirm §3c flow references §3c-i, §3d references citation behavior, §4 has complete format prompts and valid BibTeX template
- [ ] 4.2 Run scanner.js import check — confirm `generateSourceRegistry` exports without breaking existing consumers
