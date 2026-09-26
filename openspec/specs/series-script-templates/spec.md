# Series Script Templates Specification

## Purpose

Defines the `{{slot}}` placeholder convention series script templates use, how each slot carries its own fill-in instructions, where series-wide rules live, and the mandatory gate that catches unresolved placeholders before they reach VUS validation.

## Requirements

### Requirement: `{{slot}}` Placeholder Convention

A series script template MUST mark author-fillable content with `{{slot}}` placeholders. Placeholders are a visual convention for the authoring agent only; no Handlebars or other templating runtime resolves them.

#### Scenario: Template reads as plain text outside any templating engine
- GIVEN a series script template containing `{{hook_line}}`
- WHEN it is opened as a plain Markdown/text file
- THEN it reads as literal text with the `{{hook_line}}` marker, not a runtime error

### Requirement: Inline Fill-In Instructions Per Slot

Each `{{slot}}` MUST carry its own fill-in instructions as an HTML comment placed immediately after the placeholder, so instructions travel with the slot instead of living in a separate index.

#### Scenario: Slot instruction is adjacent to its placeholder
- GIVEN `{{hook_line}}<!-- One sentence, present tense, names the innovation -->`
- WHEN an authoring agent reaches this slot
- THEN it reads the fill-in instruction without consulting any other document

### Requirement: Series-Wide Rules Document

A series MUST have exactly one separate document holding rules that apply to every video in the series (tone, sound tags). Per-slot instructions MUST NOT duplicate series-wide rules.

#### Scenario: Tone rule lives once
- GIVEN a series-wide rules document declaring the series tone
- WHEN a new video is authored in that series
- THEN the tone rule is read from the shared document, not restated per slot

### Requirement: Zero-Unresolved-Placeholder Gate

The generic script-generation procedure MUST include a gate that fails when any `{{...}}` placeholder remains unresolved in the emitted script. This gate MUST run before or alongside VUS parser validation, because an unresolved placeholder is a silent bug: `vus.peggy` accepts it as ordinary narration `Content` and raises no parse error.

#### Scenario: Leaked placeholder blocks the procedure
- GIVEN an emitted script still containing `{{hook_line}}`
- WHEN the procedure's placeholder gate runs
- THEN it fails and blocks progression to VUS parser validation

#### Scenario: Fully resolved script passes the gate
- GIVEN an emitted script with zero `{{...}}` markers remaining
- WHEN the placeholder gate runs
- THEN it passes and the script proceeds to VUS parser validation
