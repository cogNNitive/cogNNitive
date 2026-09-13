# Proposal: Unified Samples Workspace SSOT & Distribution Pipeline

## Context & Motivation

Currently, canonical sample models for iNNfo Level 2 templates are stored in isolated subdirectories inside each template package (`iNNfo/specs/templates/<template>/samples/`). 

While this co-locates samples with their respective template definitions, it introduces significant architectural limitations:
1. **Lack of Integrated Context**: Samples cannot be easily tested, explored, or loaded as a unified, cohesive workspace in the iNNfo Modeler / Editor.
2. **Cross-Model Integrity Drift**: WikiLinks, cross-references, and multi-model procedures across Ghostbusters entities (e.g. Peter Venkman, Ecto-1, Proton Pack, Containment Unit across business, organization, procedures, metrics, projects, innovation) are fragmented across isolated files.
3. **Double-Maintenance & Divergence**: Maintaining individual files without an active workspace hub leads to inconsistent naming, orphan entities, and broken links.

## Proposed Changes

1. **Establish `_samples_nn/` as the Unified Ghostbusters Workspace SSOT**:
   - Create `_samples_nn/` in the repository root as a fully-featured, live iNNfo workspace.
   - Include `_samples_nn/workspace_NN.md` (Level 3 Workspace Model) declaring all domain models, procedures, sources, and tags.
   - Store all canonical Level 3 Ghostbusters models under `_samples_nn/models/`.
   - Store workspace-level procedures under `_samples_nn/procedures/`.

2. **Automated Projection / Synchronization Script (`scripts/sync-samples.mjs`)**:
   - Create a deterministic sync script that projects/copies the canonical sample models from `_samples_nn/models/` to their respective target `iNNfo/specs/templates/<template>/samples/` directories.
   - Provide a `--check` flag to verify zero-drift between `_samples_nn/` and `iNNfo/specs/templates/*/samples/`.
   - Add npm script `npm run sync:samples` (and `npm run check:samples`).

3. **Integrate into Integrity Gate (`scripts/verify.js` & `scripts/check-integrity.js`)**:
   - Add a verification step to `scripts/verify.js` ensuring that `_samples_nn/` matches template samples byte-for-byte, preventing accidental manual edits in template sample folders.

## Non-Goals

- Deprecating the distribution of samples within template packages (they will still be shipped inside templates via automated projection).
- Changing the Level 2 template specifications themselves.
