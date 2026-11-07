# synchronization-landing Specification

## Purpose
TBD - created by archiving change domain-synchronizations. Update Purpose after archive.
## Requirements
### Requirement: Landing is decided by file type

For every file selected from an origin, a refresh MUST decide the destination by file type. A knowledge model (a file for which `isModelCandidate({path: relToOrigin, frontmatter})` holds, which is exactly the set the origin itself would discover) MUST be mirrored under `sources/sync/<alias>/`. Other `_NN.md` files (changesets, sidecars, catalogs, `domaiNN_NN.md`, the origin's own `sources/`, hidden folders, archive and staging) are skipped, never copied. Every other non-`_NN.md` file MUST be copied to `sources/import/` as a write-once family member with a sidecar. A refresh MUST NOT land a file in both places.

#### Scenario: Mixed folder is split by type
- GIVEN an origin folder with `kNNowledge/org_NN.md` and `docs/policy.pdf`
- WHEN the Synchronization `org` is refreshed
- THEN `org_NN.md` exists under `sources/sync/org/`
- AND a timestamped copy of `policy.pdf` and its sidecar exist under `sources/import/`
- AND no copy of `policy.pdf` exists under `sources/sync/`

### Requirement: Models are mirrored in place with relative paths

A mirrored model MUST keep its path relative to the origin root: the file at `<origin>/a/b_NN.md` MUST land at `sources/sync/<alias>/a/b_NN.md`. A refresh MUST replace each mirrored file whose bytes differ from the origin, and MUST NOT create timestamped family members for mirrored models. Mirrored files that no longer exist at the origin MUST be removed from the mirror, so the mirror equals the selected origin set. The refresh plans (add, replace, remove) and then writes each file; a partial failure is corrected by the next refresh. A refresh MUST refuse an origin that lies inside the consumer or a consumer that lies inside the origin; symlinks are not followed.

#### Scenario: Relative paths are preserved
- GIVEN an origin with `a/b_NN.md` and `c/b_NN.md`
- WHEN the Synchronization is refreshed
- THEN both `sources/sync/<alias>/a/b_NN.md` and `sources/sync/<alias>/c/b_NN.md` exist and are distinct

#### Scenario: Changed model is replaced
- GIVEN a mirrored `b_NN.md` and an origin copy with different bytes
- WHEN the Synchronization is refreshed
- THEN the mirrored file has the origin's bytes
- AND no suffixed copy of the model exists

#### Scenario: Vanished model leaves the mirror
- GIVEN a mirrored model that the origin no longer contains
- WHEN the Synchronization is refreshed
- THEN the model is absent from the mirror

### Requirement: Mirrored models are not cognitivized and stay out of the consumer's own graph

A mirrored model MUST NOT receive a sidecar, and `cognitivize` MUST continue to reject `_NN.md` documents. Models under `sources/sync/` MUST NOT be listed as the consumer's own models by `list_knowledge`, the `## NN Models` section, manifest reconciliation or duplicate-model detection, using the existing root-`sources/` exclusion (`isUnderRootSources`).

#### Scenario: Mirror is not a consumer model
- GIVEN a mirrored `sources/sync/org/org_NN.md`
- WHEN the consumer's models are listed
- THEN `org_NN.md` is not listed
- AND no duplicate-model diagnostic is reported when the consumer also owns a model named `org`

#### Scenario: No sidecar for a mirrored model
- GIVEN a refresh that mirrors a model
- WHEN it completes
- THEN no `_sidecar_NN.md` exists for the mirrored model

### Requirement: Other files land as write-once copies with a sidecar

Every non-model file MUST be copied byte-for-byte into `sources/import/` through the write-once path (UTC-suffixed family member) and cognitivized in place. The destination MUST keep the file's origin-relative directory so that files with the same name in different origin subfolders remain separate families. Identical bytes MUST be deduplicated, and changed bytes MUST add a new member without touching earlier ones. The destination layout is `sources/import/<alias>/<origin-relative dir>/<stem>_<UTC>.<ext>`. A URL origin (`origin_uri` starting with `http://` or `https://`, `kind: file` only) is downloaded by the skill (`webImport.downloadToImport(url, dir, {subdir: alias})`) into the same layout; nn-core stays offline.

#### Scenario: Same-name files stay distinct
- GIVEN an origin with `a/README.pdf` and `b/README.pdf` with different bytes
- WHEN the Synchronization is refreshed
- THEN two distinct families exist under `sources/import/`
- AND each has its own sidecar

#### Scenario: Unchanged bytes are not re-copied
- GIVEN a previously copied file whose origin bytes are unchanged
- WHEN the Synchronization is refreshed again
- THEN no new family member and no new sidecar are written

#### Scenario: Changed bytes add a member
- GIVEN a previously copied file whose origin bytes changed
- WHEN the Synchronization is refreshed
- THEN a new suffixed member and sidecar are written
- AND the earlier member's bytes are unchanged

### Requirement: Whole files and whole folders only

A Synchronization of `kind: file` MUST target exactly one file, and a Synchronization of `kind: folder` MUST target the folder recursively. The system MUST NOT support selecting individual concepts, elements or fields from an origin model. A `kind: file` origin that is a model MUST be mirrored at `sources/sync/<alias>/<filename>`.

#### Scenario: Single-file origin
- GIVEN a Synchronization `kind:: file` whose origin is `C:/shared/org_NN.md`
- WHEN it is refreshed
- THEN `sources/sync/<alias>/org_NN.md` exists and no other file is mirrored

#### Scenario: Whole model is mirrored
- GIVEN an origin model with ten elements
- WHEN it is mirrored
- THEN the mirrored model is byte-identical to the origin model

### Requirement: A domaiNN origin mirrors only its knowledge models

When the origin is `kind: folder` and contains a `domaiNN_NN.md` entrypoint, the refresh MUST treat it as a domaiNN and mirror only its knowledge models (the `isModelCandidate` set). It MUST skip `*_changes_NN.md` changesets, sidecars, console HTML outputs, backups, the origin's own `sources/` folder, and hidden folders (names starting with `.`). It MUST NOT copy any non-model file of a domaiNN origin to `sources/import/`.

#### Scenario: Domain origin filter
- GIVEN an origin domaiNN with `domaiNN_NN.md`, `kNNowledge/org_NN.md`, `changes/x_changes_NN.md`, `kNNowledge/org_NN.md.bak`, `domaiNN_console.html`, `sources/import/a.pdf` and `.git/config`
- WHEN the Synchronization is refreshed
- THEN only the knowledge models (including the entrypoint's models) appear under `sources/sync/<alias>/`
- AND nothing from `changes/`, `sources/`, `.git/`, the backup or the console HTML is copied anywhere

#### Scenario: Non-domain folder is not filtered
- GIVEN an origin folder without `domaiNN_NN.md`
- WHEN the Synchronization is refreshed
- THEN its `_NN.md` files are mirrored and its other files are copied to `sources/import/`

