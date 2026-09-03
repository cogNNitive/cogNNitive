# Tasks: Empty Sections Mode

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 (80–100 added, ~10 modified) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add frontmatter field + new subsection + update cross-references | PR 1 (single) | Single file, single PR, no chaining needed |

## Phase 1: Frontmatter Changes

- [x] 1.1 Add `empty_sections_mode: "ask-per-section"` to YAML frontmatter after `description:` (line 3 in current file)
- [x] 1.2 Bump `metadata.version` from `"1.2"` to `"1.3"` (minor: backward-compatible feature addition). Also updated `installed_at` to `2026-07-08`.

## Phase 2: New Subsection §3c-ii

- [x] 2.1 Insert `#### 3c-ii. Handle incomplete template sections` heading between §3c-i and §3d (after line 163)
- [x] 2.2 Write Step 1: scan template sections against source content in `md/_all.md`, flag incomplete sections using LLM judgement
- [x] 2.3 Write Step 2: present summary table of flagged sections with section name and reason; skip to §3d if zero flagged
- [x] 2.4 Write Step 3: present six-mode selection prompt with pre-selection from frontmatter value and override support
- [x] 2.5 Write mode behavior table (comment, omit, generate, generate-tagged, ask-per-section, template-default) with application scope
- [x] 2.6 Write Step 4: apply chosen mode globally or per-section for `ask-per-section`
- [x] 2.7 Write Step 5: proceed to §3d after modes resolved
- [x] 2.8 Write frontmatter reference block with valid values and unrecognized-value fallback behavior

## Phase 3: Integration — Update Existing Sections

- [x] 3.1 Append bridge sentence to §3c final version block: "Once citations are settled (or skipped), proceed to handle incomplete template sections (§3c-ii)."
- [x] 3.2 Update §3d step 2 to reference empty sections handling (§3c-ii) and order it BEFORE citation format application
