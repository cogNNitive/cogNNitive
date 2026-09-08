# Delta for Template Immutability Guard

## Purpose

Document the retirement of the legacy file-cloning template immutability guard (`guard-template-immutability.js`), which prevented in-place modifications to versioned template filenames (`*_V_*.md`), in favor of immutable Git release tags (`templates-v<version>`) and CI frontmatter version bump validation.

## RETIRED Requirements

### Requirement: In-place modification of versioned templates is an error (Retired)

The legacy file-cloning requirement blocking in-place modification of `_V_` template files is RETIRED. In-place modification of canonical unversioned template files in `iNNfo/specs/templates/` is permitted on development branches, provided the frontmatter `template_version` is incremented.

#### Scenario: In-place edit of canonical template allowed with version bump
- GIVEN a canonical unversioned template `iNNfo/specs/templates/workspace/spec_NN.md`
- WHEN content changes are made in a pull request
- AND `template_version` is bumped from `"0.2.0"` to `"0.3.0"`
- THEN the legacy in-place mutation failure is not triggered

---

### Requirement: Added templates must declare a matching template_version (Retired)

Filename-to-frontmatter version consistency checking is RETIRED because template filenames in `main` no longer encode semantic versions.

#### Scenario: Added template without filename version
- GIVEN a newly added canonical template `iNNfo/specs/templates/newservice/spec_NN.md`
- WHEN CI validation executes
- THEN it checks for valid semver format in `template_version` frontmatter without expecting a matching filename suffix

---

### Requirement: Renames are not treated as errors (Retired)

Filename rename heuristics specific to `*_V_*.md` are RETIRED.

#### Scenario: Template rename verification
- GIVEN a canonical template path
- WHEN inspected during CI
- THEN file-cloning rename heuristics are bypassed
