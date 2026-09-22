# Proposal: Scanner Destination Collision Guard & Content Duplicate Detection

## Intent

Prevent silent data swaps and data corruption when normalising raw sources under `sources/import/` or `sources/original/`. Currently, if a generic or reused filename (e.g. `Tutorias.xls`) replaces or conflicts with another source pointing to the same normalized destination (`sources/nn/...`), `scanner-core.js` silently snapshots and overwrites the destination without checking if it was previously claimed by a different raw origin. Furthermore, `duplicate-guards.js` is uninvoked dead code and relies on raw file hashes instead of normalized markdown body hashes.

## Scope

### In Scope
- **Destination Collision Guard**: Abort/flag error in `processOkFile()` and `scanner-core.js` when `destPath` already exists and its declared `source_file` in frontmatter differs from incoming `sourceFileField`.
- **Content-Based Duplicate & Alias Detection**: Fix `duplicate-guards.js` to compute hashes over the normalized body content (excluding frontmatter `sha256`), and wire it into the scan/verification workflow.
- **Tree Layout Ingestion Diagnostics**: Detect when both `sources/original/` and `sources/import/` or legacy flat files in `sources/nn/` exist, avoiding silent freezing of flat normalized copies.
- **Unit & Integration Tests**: Comprehensive tests reproducing the collision scenario and verifying guards prevent overwriting.

### Out of Scope
- Changing external user Excel format or automatically rewriting downstream model citations.
- Deleting archived or historical versions under `sources/archive/`.

## Capabilities

### New Capabilities
- `scanner-destination-collision-guard`: Invariant enforcement preventing multiple distinct raw files from claiming or overwriting the same normalized destination path without explicit user resolution.

### Modified Capabilities
- `source-normalization-pipeline`: Ingestion scan path integrates destination ownership validation and normalized body deduplication.

## Approach

1. In `skills/nn-trannsform/scripts/lib/scanner-core.js`, before writing or archiving in `processOkFile()`, check whether `destPath` already exists on disk.
2. If `destPath` exists, parse its existing frontmatter:
   - Extract `existingSourceFile = existingFields.source_file || existingFields.file`.
   - If `existingSourceFile` is non-empty and differs from `sourceFileField` (normalized for posix paths), raise a collision error / abort with clear details (existing source vs incoming source).
3. In `skills/nn-trannsform/scripts/lib/duplicate-guards.js`, hash the actual normalized markdown body (stripping frontmatter), so duplicate contents originating from different raws are identified by normalized body equality.
4. Export and connect duplicate checks to `--scan` / `--check` / verification diagnostics.
5. Add unit tests covering multi-source collision and content deduplication.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-trannsform/scripts/lib/scanner-core.js` | Modified | Add destination collision guard in `processOkFile()` and tree walk checks |
| `skills/nn-trannsform/scripts/lib/duplicate-guards.js` | Modified | Fix hash calculation to use body content; wire into pipeline |
| `skills/nn-trannsform/scripts/index.js` | Modified | Surface collision and duplicate diagnostics during `--scan` and `--check` |
| `skills/nn-trannsform/test/` | New | Unit tests verifying collision prevention and body deduplication |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legitimate rename of a source file triggers false positive collision | Low | Allow `--force` or explicit `--unlink` / migration flag if source file was moved |
| Performance overhead reading existing frontmatter on scan | Low | Existing frontmatter is already read in `processOkFile()` via `getExistingFrontmatterFields` |

## Rollback Plan

Revert git changes to `scanner-core.js`, `duplicate-guards.js`, and `index.js`.

## Success Criteria

- [ ] Scanning a raw file into a `destPath` that is already claimed by a different raw fails with a destination collision error.
- [ ] Scanning identical content or updating the same raw file updates normally without false collisions.
- [ ] Duplicate detection correctly identifies identical normalized markdown bodies.
- [ ] All unit and regression tests pass cleanly.
