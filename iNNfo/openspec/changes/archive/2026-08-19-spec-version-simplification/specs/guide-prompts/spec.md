# Delta for guide-prompts

## MODIFIED Requirements

### Requirement: Guide Prompts Use innfo: Prefix

All copyable guide prompts — the three `AIGuidePanel` prompts (edit model,
import, export) plus the template-migration prompt surfaced from a model's
"newer template version" badge — MUST use the `innfo:` prefix to trigger
automatic skill routing via the `nn-router` skill. The `extractPrompt()`
function in `guide.ts` MUST wrap its three return values with `innfoPrompt()`;
the badge-sourced migration prompt MUST also be built with `innfoPrompt()`.
(Previously: scoped to exactly three `AIGuidePanel` prompts; now covers a fourth prompt sourced from a model badge rather than only from `AIGuidePanel`.)

#### Scenario: All three guide-tab prompts have innfo: prefix
- GIVEN a model is open and the Guide tab is active
- WHEN the user expands an edit/import/export step
- THEN the copyable prompt starts with `innfo:`
- AND clicking Copy copies the `innfo:` prefixed text

#### Scenario: Template-migration prompt also has innfo: prefix
- GIVEN a model's template has a newer `template_version` available
- WHEN the user opens the migration badge and views its copyable prompt
- THEN the prompt text starts with `innfo:`
- AND clicking Copy copies the `innfo:` prefixed text

## ADDED Requirements

### Requirement: Template-Migration Badge Prompt Content and Visibility

When a model's `parent_spec` resolves to an L2 template whose `template_version`
is older than the newest version available for that template name, the model
surface MUST show a passive badge stating that a newer template version exists.
The badge MUST NOT block editing or saving. It MUST expose a single copyable
`innfo:`-prefixed prompt (built via `innfoPrompt()`) that names the model, its
current `template_version`, and the newer `template_version`, and instructs the
AI to perform the migration as a new file (never an in-place edit of the model),
then run `validate_model`.

#### Scenario: Badge appears for a stale template reference
- GIVEN a model's `parent_spec` points at `business_V_0-1-0` and `business_V_0-1-2` is the newest published `business` template
- WHEN the model is opened
- THEN a passive "newer template version available" badge is shown
- AND the badge does not prevent editing or saving the model

#### Scenario: Badge is absent when the template is current
- GIVEN a model's `parent_spec` points at the newest published version of its template
- WHEN the model is opened
- THEN no template-migration badge is shown

#### Scenario: Copied prompt names both versions and the write-once rule
- GIVEN the migration badge is open
- WHEN the user copies its prompt
- THEN the copied text starts with `innfo:` and names the model, the current `template_version`, and the newer `template_version`
- AND the prompt instructs migrating the model to a new file rather than editing it in place
