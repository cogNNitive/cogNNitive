# nomenclature-commercial-web Specification

## Purpose
TBD - created by archiving change 2026-09-30-nn-nomenclature-commercial-web. Update Purpose after archive.
## Requirements
### Requirement: Canonical Entity Terms

The public web copy MUST use the canonical user-facing vocabulary for the three
entity terms across `docs/index.html`, `docs/use-cases.html`, `docs/use-cases.md`,
`docs/llms.txt`, `docs/ai-index.yaml`, and the contact/legal/privacy pages:

- **bluepriNNt** — for what the ecosystem previously called a *template* (a
  Level-2 schema an app is built on).
- **kNNowledge** — for what it previously called a *model* (a Level-3 domain
  document).
- **domaiNN** — for what it previously called a *workspace* (the container a
  kNNowledge lives in).

A generic, non-entity sense of a word is not renamed: an LLM "model" in prose
(a general model), or a generic English "workspace", stay as written.

#### Scenario: Headline and body copy use the canonical term
- GIVEN a commercial page describing a Level-3 domain document
- WHEN the copy is read
- THEN it calls it a *kNNowledge*, not a *model*
- AND a Level-2 schema is called a *bluepriNNt*, not a *template*

### Requirement: Structural Identifiers Unchanged

Renaming MUST NOT touch structural identifiers, which are load-bearing rather
than copy:

- CSS class names (`grid-template-*`, `.workspace`, `.manage-model-card`),
- DOM ids and attributes (`workspace-modal`, `model-tree-box`),
- JS function names (`openWorkspaceModal`, `closeWorkspaceModal`),
- URL query parameters (`?workspace=`, `?model=`),
- on-disk paths in code samples that are literally the real directory names.

#### Scenario: Deep links and behaviour survive the copy pass
- GIVEN a use-case page with a local-workspace button and an editor deep link
- WHEN the copy is aligned
- THEN the button still opens the modal and the `?workspace=` link still resolves

