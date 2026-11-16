# Delta for workspace

The `workspace` bluepriNNt declares four manifest sections — `# NN kNNowledge` (legacy `# NN Models`), `# NN Sources`, `# NN Procedures` and `# NN Artifacts` — but `reconcileManifest` and the `sync_domain_manifest` tool that wraps it located and owned only the kNNowledge one. A sync therefore reported every model it added or archived and said nothing about the three catalog sections, which the manifest kept declaring and no code read. The requirements below make the reconciler own all four. They also state the one place where the catalog sections are genuinely different from kNNowledge, instead of forcing uniformity: a catalog section is a pointer to one catalog document and the bluepriNNt gives it no `status::` field, so it carries no archive lifecycle and is never created when absent.

## MODIFIED Requirements

### Requirement: Every manifest section the workspace bluepriNNt declares is located and reconciled
The domain manifest reconciler MUST locate each section the `workspace` bluepriNNt declares — `# NN kNNowledge` (legacy `# NN Models`), `# NN Sources`, `# NN Procedures` and `# NN Artifacts` — and MUST preserve every byte it does not own. Reconciliation MUST stay additive and surgical: an owned entry is appended, or its own field line is rewritten, and no entry is reordered, regrouped, rewritten or deleted. A run that computes no mutation MUST return the manifest content as the exact same string reference it was given, even when it reports entries it could not resolve. Each change the reconciler computes MUST be reported in `changes` with its section, kind, `path::` target and name. (Previously: only `# NN kNNowledge` was located and owned; the other three sections were ignored silently.)

#### Scenario: A four-section manifest survives a sync that touches kNNowledge
- GIVEN a manifest carrying `# NN kNNowledge`, `# NN Sources`, `# NN Procedures` and `# NN Artifacts`, each with its own entries, and a knowledge document that has no entry yet
- WHEN `sync_domain_manifest` runs against that domain
- THEN the new knowledge entry is appended to `# NN kNNowledge` and reported as `added`
- AND the three catalog sections are byte-identical to before the sync
- AND the entries above and below the insertion are unchanged

#### Scenario: A hand-authored catalog entry is preserved
- GIVEN a `# NN Sources` section entry without the `<!-- nn:auto -->` ownership marker
- WHEN a sync runs
- THEN that entry's lines are unchanged

### Requirement: Catalog sections link one catalog document and carry no lifecycle
The `# NN Sources`, `# NN Procedures` and `# NN Artifacts` sections MUST be reconciled as links to the domain's catalog document of that kind — a `_NN.md` document at the domain root or in its own `<kind>/` folder whose `parent_spec` blueprint key is that kind — and a discovered catalog whose path has no entry in its section MUST get one tool-owned entry whose block is the entry header, the `<!-- nn:auto -->` marker and `path:: <catalog path>`. That block MUST NOT carry a `status::` line or a `blueprint::` line, because the `workspace` bluepriNNt's catalog entries declare `path::` only; the reconciler MUST NOT add, flip or archive a status in a catalog section, and a catalog document that disappears MUST NOT archive its entry. The own-line rewrite rule of kNNowledge applies here too: an entry MUST NOT be rewritten to point somewhere else — the new pointer is appended and the stale one is reported. A catalog section MUST NOT be created when the manifest does not already declare it, so a domain whose manifest omits the catalog sections stays exactly as it is, and a catalog document in a nested domaiNN, in `sources/import/`, or in an excluded path MUST NOT become an entry.

#### Scenario: An empty catalog section gets its pointer
- GIVEN a manifest with `# NN Sources` and no entry under it, and `sources/sources_NN.md` whose `parent_spec` blueprint key is `sources`
- WHEN the sync writes
- THEN `# NN Sources` holds `## NN Sources: <title>`, `<!-- nn:auto -->` and `path:: sources/sources_NN.md`
- AND the entry carries no `status::` line
- AND a second sync reports no changes and returns the content unchanged

#### Scenario: An absent catalog section is never created
- GIVEN a manifest with only `# NN kNNowledge` and a discovered `procedures/procedures_NN.md`
- WHEN the sync runs
- THEN no `# NN Procedures` header appears in the manifest
- AND the only reported change is the knowledge entry the run added

#### Scenario: An imported domain's catalog is not this domain's catalog
- GIVEN `sources/import/old-domain/sources_NN.md`
- WHEN the sync runs
- THEN no entry pointing at it is added to `# NN Sources`

### Requirement: An unresolvable catalog entry is reported, never removed
An entry in a catalog section whose `path::` target is not a discovered catalog of that section's kind MUST be reported as a `missing-target` change whose `reason` states whether the entry is tool-owned, and MUST be left in place. A run whose only changes are `missing-target` MUST NOT write the manifest, so a dry-run and a real run are both byte-identical to the input.

#### Scenario: A stale pointer is reported and kept
- GIVEN `# NN Artifacts` with `## NN Artifacts: Old` and `path:: artifacts/old_artifacts_NN.md`, and no such document in the domain
- WHEN `sync_domain_manifest` runs with `dry_run: false`
- THEN `changes` holds one `missing-target` record for that path
- AND the report says the entry is not tool-owned
- AND the manifest is byte-identical to before the run
- AND `written` is `false`

#### Scenario: A tool-owned stale pointer is reported and kept
- GIVEN the same section entry carrying `<!-- nn:auto -->` and no matching document
- WHEN the sync runs
- THEN `changes` holds one `missing-target` record whose `reason` says the entry is tool-owned
- AND the entry is still present in the manifest
