# Empty Sections Mode Specification

## Purpose

Control how the trannsform skill handles template sections where source material is insufficient. Provides a preview of incomplete sections before final output and lets the user choose a handling mode.

## Requirements

### Requirement: Frontmatter Declaration

The SKILL.md YAML frontmatter MUST support `empty_sections_mode` with one of six values: `comment`, `omit`, `generate`, `generate-tagged`, `ask-per-section`, `template-default`. Default SHALL be `ask-per-section` when absent.

| Value | Behavior |
|-------|----------|
| `comment` | Insert HTML comment placeholder |
| `omit` | Remove section heading + body |
| `generate` | Synthesize content from context, no marker |
| `generate-tagged` | Synthesize content, prepend `[Generated — verify]` |
| `ask-per-section` | Prompt user per flagged section (Default) |
| `template-default` | Keep template's original placeholder |

#### Scenarios

- GIVEN SKILL.md with `empty_sections_mode: generate` → WHEN loaded → THEN mode SHALL apply at step 3c-i
- GIVEN no `empty_sections_mode` field → WHEN loaded → THEN default to `ask-per-section`

### Requirement: Incomplete Section Scan

After the user confirms the final version (step 3c), the system MUST scan template sections against source content and flag sections as **incomplete** when no source paragraph maps to them.

- GIVEN template {Executive Summary, IOE.1, Conclusions}, source for ES and Conclusions only → THEN IOE.1 SHALL be flagged
- GIVEN all sections have mapped source → THEN no sections flagged; mode selection skipped

### Requirement: Summary Table

Before mode selection, the system MUST present a table of flagged sections with section name and why it is incomplete (e.g., "Source document missing", "No matched paragraphs").

- GIVEN 2 flagged sections with different causes → THEN each row SHALL show name + human-readable reason
- GIVEN zero flagged sections → THEN no table shown; mode selection skipped

### Requirement: Mode Selection

The system MUST present the six modes as labeled options in a pick-one prompt. The mode selected SHALL apply globally to all flagged sections.

| Label | Description |
|-------|-------------|
| Insert comment | `<!-- No hay información suficiente para completar esta sección -->` |
| Omit section | Remove heading + body from output |
| Generate content | Plausible content from project context; no marker |
| Generate (tagged) | Plausible content; prepend `[Generated — verify]` |
| Ask per section | Prompt user individually per section (Recommended) |
| Keep placeholder | Template's original text (e.g. `[Pending]`) |

- GIVEN user selects a mode → THEN that mode SHALL apply to every flagged section

### Requirement: Comment Mode

When mode is `comment`, insert `<!-- No hay información suficiente para completar esta sección -->` in place of the flagged section's body. Heading SHALL remain.

- GIVEN flagged section "IOE.1" in comment mode → THEN output SHALL contain `## IOE.1` followed by the HTML comment

### Requirement: Omit Mode

When mode is `omit`, remove both heading and body of flagged sections from output. Surrounding sections SHALL close without blank gaps.

- GIVEN flagged "IOE.1" between "ES" and "Conclusions" in omit mode → THEN "ES" SHALL be followed directly by "Conclusions"

### Requirement: Generate Mode

When mode is `generate`, produce plausible content from project context (source files, prior sections, document purpose). No marker or annotation SHALL appear.

- GIVEN flagged "Recommendations" with project context → THEN content SHALL be synthesized; no `[Generated]` marker SHALL appear

### Requirement: Generate-Tagged Mode

When mode is `generate-tagged`, produce content as in generate mode AND prepend `[Generated — verify]` at the section body start.

- GIVEN flagged section in generate-tagged mode → THEN body SHALL begin with `[Generated — verify]` followed by synthesized content

### Requirement: Ask-Per-Section Mode

When mode is `ask-per-section`, iterate over each flagged section showing name + reason, prompting the user per section. Valid choices: `comment`, `omit`, `generate`, `generate-tagged`, `template-default`.

- GIVEN 3 flagged sections → WHEN user chooses `omit`, `comment`, `generate` respectively → THEN each SHALL be handled per choice

### Requirement: Template-Default Mode

When mode is `template-default`, keep the template's original placeholder verbatim. MUST NOT replace or remove it.

- GIVEN template placeholder `[Pending]` and source missing → THEN output SHALL contain `[Pending]`
- GIVEN template section with empty body → THEN output SHALL keep heading + empty body

### Requirement: Invalid Mode Handling

If `empty_sections_mode` contains an unrecognized value, the system MUST fall back to `ask-per-section` and SHALL warn the user.

- GIVEN `empty_sections_mode: unknown-mode` → WHEN loaded → THEN warn and proceed with `ask-per-section`

### Requirement: Mode Override

The user MAY override any frontmatter-declared mode at the summary step. The runtime choice SHALL take precedence.

- GIVEN frontmatter sets `omit` → WHEN summary shown → THEN pre-select `omit` as default, allow override
