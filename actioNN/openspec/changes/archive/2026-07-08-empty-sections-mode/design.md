# Design: Empty Sections Mode

## Technical Approach

Add a YAML frontmatter field `empty_sections_mode` to control how the trannsform skill handles template sections where no source material exists. Insert a new step between citation format selection (3c-i) and transformation (3d) that: (1) scans template sections against source content, (2) presents a summary table of flagged sections, and (3) lets the user choose a handling mode.

The scan is agent-performed (LLM compares template structure against `md/_all.md` content) — no static analysis tool. The mode selection is the user's last decision before generation begins.

## Architecture Decisions

### Decision 1: Insertion point — after 3c-i, before 3d

| Option | Tradeoff | Decision |
|--------|----------|----------|
| After 3c, before citation format | User would choose empty-sections mode before knowing citation format, then pick citation format — ordering feels backwards (citation format affects only existing content, empty-sections affects non-existent content) | ❌ Wrong ordering |
| After 3c-i, before 3d | Empty-sections mode runs after citation format is settled. The user has already decided how to handle existing content, and this step addresses what's missing. Natural last decision before generation. | ✅ **Choice** — labeled `#### 3c-ii. Handle incomplete template sections` |
| Inside 3d as a conditional | Would inline the logic in 3d, making 3d longer and harder to follow. The step has its own branching (6 modes) that deserves a dedicated section. | ❌ Violates separation of concerns |

### Decision 2: Draft path excluded

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Apply to both draft and final | Draft already has review markers, uncertainty annotations (`[unconfirmed data — review]`), and inline HTML comments. Running empty-sections mode on top would add a redundant layer — incomplete sections are already visible in the draft structure. | ❌ Redundant |
| Apply only to final version | Clean output needs a decision on what to do with each gap. The user must explicitly choose before the model generates. | ✅ **Choice** — consistent with spec requirement "After the user confirms the final version (step 3c)" |

### Decision 3: Section scanning — agent-performed, user-validated

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Static parser in scripts/ | Would need a Node.js tool that reads template markers and source frontmatter. Adds maintenance burden, CLI dependency, and still can't judge semantic gaps (which sections "should" have content vs. optional ones). | ❌ Over-engineered, still needs agent judgement |
| Agent scans with LLM | The agent already reads the template and `md/_all.md` in step 3d. Same capability applies earlier for section scanning. The agent lists sections it cannot match to source paragraphs. Risk of hallucination mitigated by showing the table to the user for validation before mode selection. | ✅ **Choice** — zero new dependencies, same mechanism as 3d |

### Decision 4: Global vs per-section mode application

| Option | Tradeoff | Decision |
|--------|----------|----------|
| All modes per-section | Maximum granularity but 5× the interaction burden. User would answer 5-15 individual questions for a moderate document. | ❌ Too much friction for non-`ask-per-section` modes |
| `ask-per-section` iterates per section; other 5 modes apply globally | `ask-per-section` is the user's explicit choice for per-section control. The other 5 modes are unambiguous: apply the same treatment to every flagged section. This keeps `generate`, `omit`, `comment`, etc. as single-choice decisions while reserving per-section for when the user needs it. | ✅ **Choice** — keeps 1:1 with spec requirement "Mode selected SHALL apply globally to all flagged sections" |

### Decision 5: Mode selection always presented (even with frontmatter default)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Skip selection when frontmatter has explicit value | User would have no chance to override at runtime. Breaks Requirement: Mode Override. | ❌ Violates spec |
| Always show summary table + mode selection, pre-selecting frontmatter value | Summary table is always displayed for transparency (visibility of incomplete sections). Mode prompt pre-selects the frontmatter value as default but allows override. Zero-flag case skips everything. | ✅ **Choice** — matches Requirement: Mode Override and Requirement: Zero Flagged Sections |

### Decision 6: Frontmatter position

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Under `metadata:` alongside `version` | The field controls runtime behavior, not metadata about the skill file itself. Putting it in `metadata` would mix concerns. | ❌ Semantic mismatch |
| Top-level between `description:` and `license:` | Top-level frontmatter for runtime configuration. Clean separation: `metadata` = file metadata, top-level fields = behavior configuration. | ✅ **Choice** — follows existing pattern (`description` is also top-level, not under `metadata`) |

## User Interaction Flow

```
§3c: "Draft or final?"
  ├── Draft → skip empty-sections mode → §3d
  └── Final → citation options:
        ├── [A] Include sources → §3c-i (format selection)
        ├── [B] Review draft first → edit → §3c-i
        ├── [C] No sources → skip §3c-i
        └── [X] Cancel
              │
              ▼ (converge)
        §3c-ii: Handle incomplete template sections
              │
              ├─ Scan sections against source
              ├─ Flag incomplete sections
              │
              ├─ If 0 flagged → skip → §3d
              │
              └─ If ≥1 flagged:
                   ├─ Show summary table
                   ├─ Present mode selection (6 modes)
                   │    (pre-select from frontmatter / default ask-per-section)
                   │
                   ├─ Global modes (5): apply same mode to all flagged sections
                   └─ Ask-per-section: iterate flagged sections, prompt per section
                        │
                        ▼
                   §3d: Perform transformation (with mode applied)
```

### Mode selection prompt

```
The following template sections lack source material:

  # │ Section          │ Reason
  ───┼─────────────────┼──────────────────────────────────
  1  │ IOE.1           │ No source paragraphs match this section
  2  │ Recommendations │ Only indirect mentions; no dedicated content
  3  │ Annex C         │ Source document is missing for this appendix

[empty_sections_mode is set to "ask-per-section" (default)]

How do you want to handle the flagged sections?

  [a] Insert comment    — Place HTML comment: "<!-- No hay información suficiente... -->"
  [b] Omit section      — Remove heading + body from output
  [c] Generate content  — Synthesize from project context (no marker) (Version default)
  [d] Generate (tagged) — Synthesize, prepend "[Generated — verify]"
  [e] Ask per section   — Prompt me for each flagged section individually (Recommended)
  [f] Keep placeholder  — Keep template's original text (e.g. "[Pending]")
  [x] Cancel transformation
```

Note: The pre-selected option indicated by `[empty_sections_mode frontmatter value]` at the top of the prompt. The recommended default for the runtime is `ask-per-section` (`[e]`). The frontmatter pre-select changes only the marked default, not the recommendation label.

## Data Flow

```
Template (*traNNsform.md)             Source (md/_all.md)
         │                                    │
         ▼                                    ▼
   Agent reads template sections      Agent reads source paragraphs
         │                                    │
         └──────────────┬─────────────────────┘
                        ▼
         Agent compares: can each template section
         be mapped to source paragraph(s)?
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
        Has source?           No source?
        → ready section      → flagged section
              │                    │
              │              ┌─────┴──────┐
              │              ▼            ▼
              │         Summary       Skip if 0
              │         table +       flagged
              │         mode select         │
              │              │              │
              └──────┬───────┘              │
                     ▼                      │
              Apply mode per                │
              flagged section               │
                     │                      │
                     └──────┬───────────────┘
                            ▼
                     §3d: Generate output
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/nn-trannsform/SKILL.md` | Modify | Add frontmatter field, insert §3c-ii, update §3d reference |
| `openspec/specs/empty-sections-mode/spec.md` | New | Already written (capability spec with GWT scenarios) |
| `openspec/changes/empty-sections-mode/design.md` | New | This document |

## SKILL.md Changes — Line-Level Detail

### Frontmatter diff

**Current** (lines 1-10):
```yaml
---
name: nn-trannsform
description: "Bootstrap projects, scan raw documents..."
license: MIT
metadata:
  version: "1.2"
  source_type: "integrated"
  source: "https://github.com/cogNNitive/actioNN/tree/main/skills/nn-trannsform"
  installed_at: "2026-06-27"
---
```

**Replace with**:
```yaml
---
name: nn-trannsform
description: "Bootstrap projects, scan raw documents..."
empty_sections_mode: "ask-per-section"
license: MIT
metadata:
  version: "1.3"
  source_type: "integrated"
  source: "https://github.com/cogNNitive/actioNN/tree/main/skills/nn-trannsform"
  installed_at: "2026-06-27"
---
```

Add `empty_sections_mode: "ask-per-section"` on line 4 (after description). Bump `version` from `"1.2"` to `"1.3"` (minor: backward-compatible feature addition).

### §3c (lines 126-143): Add reference to new step in final path

**Current** (lines 134-143):
```
- If they choose **final version**: Generated clean, without annotations. Then ask:

  **"How do you want to handle citations in the final version?"**

  - **[A]** Include sources inline (Recommended) — prompts citation format selection (SS3c-i)
  - **[B]** Review draft first — shows the draft for editing, then prompts format selection after edits
  - **[C]** No sources — strips all HTML comments and visible citations from the output
  - **[X]** Cancel

  File name: `[template-name]_V_x-y-z.md` (e.g. `Lean_Business_Plan_V_0-1-0.md`, starting at 0.1.0).
```

**New**: Append at end of final version block:
```
- Once citations are settled (or skipped), proceed to handle incomplete template sections (§3c-ii).
```

This is a small bridge sentence to connect the citation flow to the new step.

### New subsection §3c-ii (insert between line 163 and line 164)

Insert after the last line of `#### 3c-i. Citation format selection` (after line 163, the empty line before `#### 3d`) and before `#### 3d. Perform the transformation`:

```markdown
#### 3c-ii. Handle incomplete template sections

**This step runs only for final versions.** Draft versions skip directly to §3d.

**Step 1: Scan sections against source material.** Compare the selected template's sections against the available source content in `md/_all.md`. For each section, determine whether sufficient source paragraphs exist to populate it. Flag sections as **incomplete** when no source paragraph maps to them. Use your own LLM judgement for the mapping — there is no static tool for this.

**Step 2: Present summary table.** If one or more sections are flagged, display a table with section name and reason for each:

```
The following template sections lack sufficient source material:

  # │ Section          │ Reason
  ───┼─────────────────┼──────────────────────────────────
  1  │ IOE.1           │ No source paragraphs match this section
  2  │ Recommendations │ Only indirect mentions; no dedicated content
  3  │ Annex C         │ Source document missing for this appendix
```

If **no sections are flagged**, skip the rest of §3c-ii and proceed directly to §3d.

**Step 3: Ask the user which mode to use.** Present the six modes as labeled options. Pre-select the option matching `empty_sections_mode` in the frontmatter (default: `ask-per-section`). The user MAY override at runtime; the runtime choice takes precedence.

```
[empty_sections_mode is set to "{frontmatter_value}"]

How do you want to handle the flagged sections?

  [a] Insert comment    — Place HTML comment: "<!-- No hay información suficiente para completar esta sección -->"
  [b] Omit section      — Remove heading + body from output
  [c] Generate content  — Synthesize from project context (no marker)
  [d] Generate (tagged) — Synthesize, prepend "[Generated — verify]"
  [e] Ask per section   — Prompt me for each flagged section individually (Recommended)
  [f] Keep placeholder  — Keep template's original text (e.g. "[Pending]")
  [x] Cancel transformation
```

| Mode | Behavior | Application |
|------|----------|-------------|
| `[a]` comment | Insert `<!-- No hay información suficiente para completar esta sección -->` in place of the section body. Heading remains. | Global (same for all flagged sections) |
| `[b]` omit | Remove heading + body from output. Surrounding sections close without blank gaps. | Global |
| `[c]` generate | Synthesize plausible content from project context (source files, prior sections, document purpose). No marker. | Global |
| `[d]` generate-tagged | Same as `[c]` but prepend `[Generated — verify]` at the start of the section body. | Global |
| `[e]` ask-per-section | Iterate flagged sections one by one. For each, show name + reason and prompt: `comment`, `omit`, `generate`, `generate-tagged`, or `template-default`. | Per-section (different modes per section) |
| `[f]` template-default | Keep the template's original placeholder text verbatim (e.g. `[Pending]`). For an empty body, keep heading + empty body. | Global |

**Step 4: Apply the mode.** For modes `[a]–[d]` and `[f]`: apply the chosen behavior to every flagged section. For mode `[e]`: iterate flagged sections, prompt individually, and apply per-section.

**Step 5: Proceed to generation.** Once modes are resolved, proceed to §3d.

**Frontmatter reference:**

```yaml
# Default: "ask-per-section"
# Valid values: comment, omit, generate, generate-tagged, ask-per-section, template-default
empty_sections_mode: "ask-per-section"
```

If `empty_sections_mode` contains an unrecognized value, warn the user and fall back to `ask-per-section`.
```

### §3d (lines 164-177): Reference the empty-sections handling

**Current** (lines 166-170):
```
1. Read the template and `md/_all.md`.
2. Using your own LLM as agent, generate the transformed document following the template instructions and version rules (draft or final).
   - If **draft**: include HTML comments + visible citations per SS4 draft rules.
   - If **final with [A] or [B]**: apply the chosen citation format (SS3c-i). HTML comments MUST be removed; visible citations formatted per the selected style.
   - If **final with [C]**: strip ALL `<!-- cite: ... -->` HTML comments AND `— Source: ...` visible citations from the output.
3. Write the file in `output/` with the corresponding name.
```

**Replace step 2** with:
```
2. Using your own LLM as agent, generate the transformed document following the template instructions and version rules (draft or final), with the empty sections mode applied (§3c-ii).
   - If **draft**: include HTML comments + visible citations per SS4 draft rules.
   - If **final with [A] or [B]**: first apply empty sections handling (§3c-ii), THEN apply the chosen citation format (SS3c-i). HTML comments MUST be removed; visible citations formatted per the selected style.
   - If **final with [C]**: apply empty sections handling (§3c-ii), then strip ALL `<!-- cite: ... -->` HTML comments AND `— Source: ...` visible citations from the output.
```

## Mode Behavior Summary

| Mode | Section Heading | Section Body | User Interaction |
|------|----------------|--------------|------------------|
| `comment` | Kept | Replaced with HTML comment | Single choice |
| `omit` | Removed | Removed | Single choice |
| `generate` | Kept | Synthesized from context | Single choice |
| `generate-tagged` | Kept | `[Generated — verify]` + synthesized | Single choice |
| `ask-per-section` | Per user per section | Per user per section | Iterated prompts |
| `template-default` | Kept | Template placeholder verbatim | Single choice |

### Output examples per mode

Given flagged section `## IOE.1` with template body `[Pending]`:

**comment**:
```markdown
## IOE.1
<!-- No hay información suficiente para completar esta sección -->
```

**omit**: (section completely absent — adjacent sections close gap)

**generate**:
```markdown
## IOE.1
The project documented 17 active community organizations in the operational area...
```
(Content synthesized from project context — no marker)

**generate-tagged**:
```markdown
## IOE.1
[Generated — verify] The project documented 17 active community organizations in the operational area...
```

**ask-per-section**: User decides per section; output depends on per-section choice.

**template-default**:
```markdown
## IOE.1
[Pending]
```

## Ordering interaction: empty-sections mode vs. citation format

**Important ordering rule**: Empty sections handling runs BEFORE citation format application, not after. Rationale:

1. **comment** mode may insert an HTML comment — this is a structural placeholder, not a citation. The citation formatter should see it and leave it alone.
2. **generate** and **generate-tagged** produce new content that may itself contain citations. The new content needs to go through citation formatting too.
3. **omit** removes the section entirely — no citation formatting needed for it.

This means the generation flow for final versions is:

```
1. Read template + source
2. Apply empty sections mode (§3c-ii) — resolve what to do with gaps
3. THEN apply citation format (§3c-i rules) to the assembled content
4. Write output
```

Exception: for `template-default` and `keep placeholder`, no content is generated so citation formatting is a no-op for that section.

## Backward Compatibility

- **Existing skills**: Junctions and symlinks to `skills/nn-trannsform/` pick up the modified SKILL.md on next skill load. No configuration changes needed.
- **Existing templates**: Template format is unchanged. No new markers or structural requirements.
- **Existing projects**: Projects already in `Documents/traNNsform/` are unaffected. The new step only activates when the user reaches §3c-ii during a new transformation.
- **Default behavior**: When `empty_sections_mode` is absent (existing installs), default is `ask-per-section` — the step runs but prompts the user explicitly. No silent change to existing behavior.
- **Draft path**: Unchanged. Draft generation skips §3c-ii entirely. Existing draft/annotations pipeline is untouched.

## Edge Cases & Risks

| Edge Case | Handling | Risk |
|-----------|----------|------|
| Template has 0 sections | No sections → 0 flagged → skip §3c-ii | Low — natural no-op |
| All sections have source | 0 flagged → skip §3c-ii | Low — best case |
| User switches from global to per-section at runtime | Runtime override takes precedence; agent iterates flagged sections | Low — spec requirement |
| Unrecognized frontmatter value | Warn and fall back to `ask-per-section` | Low — graceful degradation |
| Agent hallucinates missing sections (false positive) | User sees them in the table and can choose `omit` or `template-default` for sections that actually exist | Medium — mitigated by user visibility |
| Agent misses missing sections (false negative) | User won't see a section that's actually incomplete. Output may have gaps. | Medium-low — the agent already generates from source in 3d; if source is missing, the generated section will be thin regardless. The user can inspect the output. |
| Section has partial but not full coverage | Flagged as incomplete with reason "Partial coverage — only indirect mentions" | Low — the reason column makes it visible |
| `generate` mode produces misleading content | This is a deliberate user choice. The user opted in knowing the risk. | Medium — documented in proposal risks |

## Open Questions

- None. All design decisions resolved by spec + proposal.

## Next Step

Ready for tasks (sdd-tasks).
