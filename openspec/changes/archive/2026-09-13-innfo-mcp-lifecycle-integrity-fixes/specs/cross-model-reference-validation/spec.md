# Delta for Cross-Model Reference Validation

## ADDED Requirements

### Requirement: Convention Checker Bypasses Qualified Cross-Model References

The `conv-wikilinks` convention check (in `content.ts`) MUST NOT flag a qualified cross-model reference `[[Model Title :: Element Name]]` as an undefined local reference. It MUST bypass any wikilink value matching the qualified form and defer existence/membership checking to `validateWorkspaceReferences()`, mirroring the existing `AD-06` bypass in `references.ts`. The bypass MUST match the qualified form with a precise pattern (`[[<text> :: <text>]]`), not a bare `includes('::')` check, so a genuinely broken local wikilink that happens to contain `::` is not silently hidden.

#### Scenario: Valid qualified reference produces no conv-wikilinks warning

- GIVEN a document containing `[[Acme Org :: Jane Doe]]` where `Acme Org` and `Jane Doe` resolve via `validateWorkspaceReferences()`
- WHEN `conv-wikilinks` scans the document
- THEN no undefined-reference warning is emitted for that value

#### Scenario: Invalid qualified reference is reported by the workspace checker, not the generic one

- GIVEN a document containing `[[Nonexistent Model :: Jane Doe]]`
- WHEN both `conv-wikilinks` and `validateWorkspaceReferences()` run
- THEN `conv-wikilinks` does not emit a generic "N undefined reference(s)" warning for that value
- AND `validateWorkspaceReferences()` reports the specific dangling-target diagnostic

#### Scenario: Non-qualified local wikilink is still checked normally

- GIVEN a document containing a plain local wikilink `[[Some Concept]]` with no `::`
- WHEN `conv-wikilinks` scans the document
- THEN it is checked against local concept names as before, unaffected by the bypass

#### Scenario: A malformed value containing "::" but not matching the qualified form is not silently hidden

- GIVEN a document containing a value that includes `::` but does not match the precise `[[<text> :: <text>]]` pattern
- WHEN `conv-wikilinks` scans the document
- THEN the value is NOT bypassed and remains subject to existing local-reference checking

---

**Spec inconsistency flagged (not hidden)**: the current `Qualified Cross-Model Reference Syntax` requirement in `openspec/specs/cross-model-reference-validation/spec.md` states "`references.ts` keeps its existing per-file bypass for any `::`/`[...]` value" but says nothing about `content.ts`'s `conv-wikilinks` check, which independently scans every raw `[[...]]` with no bypass at all. That existing requirement is not wrong about `references.ts` — it is simply silent about the second checker. This delta closes that gap with a new requirement rather than editing the existing one, since no prior text about `conv-wikilinks` behavior existed to modify.
