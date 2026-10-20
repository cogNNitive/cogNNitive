# Delta Spec: canonical-vocabulary

Scope guard: the iNNfo term, the Level-1 name, the skill `nn-innfo`, the `docs/innfo/` URL base and all internal non-file identifiers stay canonical and live. They MUST NOT be recorded as retired by any requirement here.

## ADDED Requirements

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
