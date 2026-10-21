# Canonical Vocabulary Specification

## Purpose

Pin a canonical term dictionary for the cogNNitive ecosystem, collapsing overlapping vocabulary onto canonical nouns with explicit deprecated aliases. Establishes **bluepriNNt** as the canonical term for the Level-2 schema while keeping all resolution identifiers stable, and documents **template** and **app** as deprecated aliases.
## Requirements
### Requirement: Canonical term dictionary is machine-readable and human-visible

The system MUST provide a canonical term dictionary in two forms: a machine-readable map (`vocabulary.json` under `iNNfo/specs/`) that drives console labels and skill copy, and a human-readable page under `docs/innfo/documentation/vocabulary.md`. The `iNNfo/AGENTS.md` and root `AGENTS.md` "Canonical Vocabulary & Ubiquitous Language" block MUST match. (Previously: the dictionary drove `innfo-editor` labels.)

#### Scenario: Dictionary consumed by console labels

- GIVEN the canonical dictionary published as `vocabulary.json`
- WHEN the console renders a label for a Level-2 schema
- THEN the label MUST use the canonical term `bluepriNNt` for the schema sense

#### Scenario: Dictionary rendered as docs page

- GIVEN the canonical dictionary
- WHEN `docs/innfo/documentation/vocabulary.md` is generated
- THEN it lists every canonical term (`defiNNition`, `iNNfo`, `bluepriNNt`, `kNNowledge`, `domaiNN`) with its deprecated aliases and sense exclusions

### Requirement: `bluepriNNt` is canonical, `template` and `app` are explicit deprecated aliases

The dictionary MUST declare **bluepriNNt** as the canonical noun for the Level-2 schema (`_spec_NN.md` pinned by `parent_spec`). **template** and **app** MUST be accepted as documented deprecated aliases. The deprecation MUST follow the `provenance-vocabulary` pattern: explicit, published, and never a silent fallback.

#### Scenario: New copy uses bluepriNNt

- GIVEN user-facing copy authored after this change
- WHEN it refers to a Level-2 schema
- THEN it MUST use `bluepriNNt`, not `template` or `app`

#### Scenario: Legacy copy still readable

- GIVEN existing docs/skills that say `template` or `app`
- WHEN the dictionary deprecation window is open
- THEN `template` and `app` resolve to `bluepriNNt` with a deprecation note in the dictionary

### Requirement: Excluded senses of "template"

The rename MUST NOT apply to: nn-trannsform's transformation templates (`traNNsformations/` directory, CLI `--apply <name>`), HTML `<template>` elements, or generic English usage. The dictionary MUST record these exclusions explicitly. (Previously: the exclusion named Vue SFC `<template>` blocks in `innfo-editor`, which is retired.)

#### Scenario: nn-trannsform vocabulary untouched

- GIVEN `nn-trannsform` skill copy
- WHEN it refers to its transformation templates
- THEN the term `template` remains valid in that context and is NOT renamed

#### Scenario: Source code syntax untouched

- GIVEN console sources using HTML `<template>` elements
- WHEN inspected after this change
- THEN those elements are byte-identical

### Requirement: Identifiers remain stable

All resolution-bearing identifiers MUST remain unchanged: `iNNfo/specs/templates/<name>/` paths, `spec_url`, `parent_spec.url`, `template_version`, `template_name`, MCP tool names (`get_template`, `validate_template`, `list_templates`, `hydrate_template`, `list_template_procedures`, `list_template_skills`), manifest `templates:`/`frozen_templates:`/`ref_key: templates`, git tags `templates-v*`, `SHIPPED_TEMPLATE_VERSIONS` keys, and hydration paths. Each stable identifier MUST be recorded in the dictionary's alias table.

#### Scenario: No identifier migration in this change

- GIVEN the dictionary's "planned migrations" section
- WHEN it is read
- THEN every stable identifier is listed as a future migration candidate, not a current one

#### Scenario: Resolution unaffected

- GIVEN a Level-3 model pinning `parent_spec.url` to a template spec URL
- WHEN resolved after this change
- THEN resolution succeeds unchanged

### Requirement: Element-vocabulary audit

The audit MUST review L2 Concept Definition names in the 13 active templates AND the Ghostbusters Inc. canonical samples, and MUST produce a proposed simpler surface. Scope is pinned to those two artifact sets; MCP tool names and internal SDD spec identifiers are out of scope.

#### Scenario: Audit covers samples

- GIVEN the element-vocabulary audit
- WHEN it runs
- THEN it reviews concept names in `iNNfo/specs/templates/*/spec_NN.md` and `*/samples/Ghostbusters*.md`

#### Scenario: Audit produces a proposal

- GIVEN the audit output
- WHEN it is reviewed
- THEN it proposes a consistent, simpler element-vocabulary surface for a follow-up change

### Requirement: Backlog follow-up item for identifier migration

The unified backlog MUST gain a new work item recording the future mechanical identifier migration (paths, URLs, keys, tags) as a coordinated release-bound change.

#### Scenario: Follow-up item exists

- GIVEN `openspec/backlog.md`
- WHEN read after this change
- THEN it contains a new work item for the identifier migration with the dictionary's "planned migrations" section as its source

### Requirement: `sidecar` and `cognitivize` are canonical terms

`iNNfo/specs/vocabulary.json` MUST define `sidecar` (the co-located `<file>.<ext>_sidecar_NN.md` document that carries a file's hash, size, metadata, and, for binary files, a normalized body) and `cognitivize` (the operation that creates or refreshes a sidecar in place). `docs/innfo/documentation/vocabulary.md` MUST render both. The terms MUST be noted as concepts, not as new levels: a `sidecar` is a kNNowledge-level document that is never a model. The root and `iNNfo` `AGENTS.md` vocabulary blocks MUST stay consistent with the dictionary.

#### Scenario: Dictionary entries exist
- GIVEN `vocabulary.json`
- WHEN parsed
- THEN entries for `sidecar` and `cognitivize` exist with definitions

#### Scenario: Docs page renders the terms
- GIVEN the generated vocabulary page
- WHEN read
- THEN it lists `sidecar` and `cognitivize` with their definitions

#### Scenario: Dictionary and AGENTS blocks agree
- GIVEN the canonical dictionary
- WHEN the vocabulary consistency check runs
- THEN no mismatch is reported

### Requirement: Release notes list procedure and layout renames

The release notes for this change MUST list every renamed procedure file and the retired folders, because URLs pinned to older `blueprints-v*` tags keep resolving and no redirect is provided.

#### Scenario: Notes complete
- GIVEN the release handoff notes
- WHEN compared with the renamed procedure files
- THEN every rename is listed

### Requirement: Console is the user-facing UI term

The canonical term dictionary (`iNNfo/specs/vocabulary.json`, `docs/innfo/documentation/vocabulary.md`) MUST define "console" as the user-facing term for the UI that shows and reviews a domaiNN: the domain console (`domaiNN_console.html`, one per domaiNN) whose specialized surfaces are views shown as tabs. "editor" and "hosted app" (the retired `cognnitive.com/innfo/app/` web application) MUST be listed as retired UI terms and MUST NOT be used in user-facing copy for that UI. This does not touch "app" as the deprecated alias of `bluepriNNt`, which keeps its existing entry.

#### Scenario: The dictionary defines console
- GIVEN `iNNfo/specs/vocabulary.json`
- WHEN its UI terms are read
- THEN "console" is defined as user-facing
- AND "editor" and "hosted app" are marked retired UI terms

#### Scenario: Docs use console
- GIVEN `docs/innfo/documentation/vocabulary.md`
- WHEN it is read
- THEN it names the domain console and its views, and not an editor or a hosted app

### Requirement: Marker Retired, Field and Tag Defined

`iNNfo/specs/vocabulary.json` and the generated `docs/innfo/documentation/vocabulary.md` MUST list the L1 primitives as Concept, Field and Matrix, MUST NOT define `Marker Definition` as a live primitive, and MUST define `tag` as a value of the ordinary multi-valued `tags` Field. A `Marker` entry MAY remain only as a retired term pointing to `MARKERS_REMOVED`.

#### Scenario: Three primitives
- GIVEN `vocabulary.json`
- WHEN the L1 primitive entries are read
- THEN exactly Concept, Field and Matrix are live primitives

#### Scenario: Tag defined as a Field value
- GIVEN the vocabulary page
- WHEN the entry for `tag` is read
- THEN it states that a tag is a value of the `tags` Field

### Requirement: Retired distribution identifiers are recorded in the dictionary

In the cleanup commit (after the first `nn-*` releases publish), `iNNfo/specs/vocabulary.json` MUST list the retired distribution identifiers in `retired_identifiers`, each with `id`, `old`, `new`, `kind` and `notes` in the existing entry shape. The entries MUST cover at least: the release keys and tag families `innfo-mcp` and `innfo-console` (new: `nn-mcp`, `nn-console`), the packages `@cognnitive/innfo-core`, `@cognnitive/innfo-mcp` and `@cognnitive/innfo-console` (new: `@cognnitive/nn-*`), the directories `iNNfo/packages/innfo-core` and `iNNfo/packages/innfo-mcp`, the MCP bin and server name `innfo-mcp`, the tool prefix `innfo-mcp_`, the console shell pin `@innfo-console-v`, and the console asset and generated file name prefix `innfo-` (new: `nn-`). The `notes` of each entry MUST state that existing git tags, published CDN files and stamped exports under the old name remain valid and are not renamed. `docs/innfo/documentation/vocabulary.md` MUST render the new entries.

#### Scenario: Old names are recorded
- GIVEN `vocabulary.json` after the cleanup commit
- WHEN `retired_identifiers` is read
- THEN it contains an entry for each retired distribution identifier listed above
- AND each entry names its `nn-` replacement in `new`

#### Scenario: Entries state that history is kept
- GIVEN the entry for `innfo-mcp`
- WHEN its `notes` are read
- THEN they state that existing `innfo-mcp-v*` tags and CDN files remain resolvable

#### Scenario: Docs page renders them
- GIVEN the generated `docs/innfo/documentation/vocabulary.md`
- WHEN it is read after the cleanup commit
- THEN the retired distribution identifiers are listed with their replacements

### Requirement: Rename scope exclusions are never recorded as retired

`retired_identifiers` MUST NOT contain the iNNfo term, the Level-1 name `iNNfo`, the skill `nn-innfo`, the `docs/innfo/` URL base (`cognnitive.com/innfo/`), the `InnfoConsole` and `InnfoSlug` globals, the `--innfo-*` CSS tokens, the `innfo-config`, `innfo-model` and `innfo-schema` slot ids, the `innfo-console:v3:` storage key, `__INNFO_MCP_VERSION__` or the `INNFO_*` environment variables. The vocabulary consistency check MUST fail if any of them is added.

#### Scenario: Excluded name added by mistake
- GIVEN a `retired_identifiers` entry whose `old` is `nn-innfo` or `InnfoConsole`
- WHEN the vocabulary consistency check runs
- THEN it fails and names the entry

#### Scenario: Canonical terms intact
- GIVEN `vocabulary.json` after the cleanup commit
- WHEN the canonical terms are listed
- THEN `defiNNition`, `iNNfo`, `bluepriNNt`, `kNNowledge` and `domaiNN` are still defined and unchanged

### Requirement: Retired distribution identifiers are guarded against reintroduction

After the cleanup commit the `no-retired-references` guard MUST fail when a retired distribution identifier appears in a live file. It MUST allow these classes only: frozen history (`openspec/changes/**` and archive indexes, stamped and simulacro fixtures, `dev/*.md`, `simulation/FINDINGS.md`), published manifests and snapshots, existing git tags and references to them, the retired-identifier list itself, and the reader regexes that accept legacy console pins so tooling can read stamped exports. Living specs under `openspec/specs/` MUST use the `nn-` names except where they quote a legacy tag as history.

#### Scenario: Live file reintroduces an old name
- GIVEN a script that references `iNNfo/packages/innfo-mcp`
- WHEN the guard runs after the cleanup commit
- THEN it fails and names the file

#### Scenario: Frozen history is allowed
- GIVEN an archived change under `openspec/changes/archive/` that mentions `innfo-mcp`
- WHEN the guard runs
- THEN it passes

#### Scenario: Reading legacy pins is allowed
- GIVEN the shell-pin regex that also matches `@innfo-console-v`
- WHEN the guard runs
- THEN it does not flag the regex

#### Scenario: Completeness check
- GIVEN the repository after the cleanup commit
- WHEN `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` runs outside the allowed classes
- THEN it returns zero matches

