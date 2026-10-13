# Design: S4 — domain reference migration

## Rewrite map

The migrator builds `name -> slug` per model from the frozen slugs (S1), then resolves and
rewrites:

- `reference` fields (`sibling`, `owner`, ...): `[[Name]]` / name → the target slug.
- matrix row/column headers: name → slug.
- cross-model references: `[[Model :: Element]]` → slug address.
- citations: rewrite to the current grammar (`path@## Heading`, `csv@row`, `json@/ptr`).

Ambiguity (two elements share a name, different slugs) is reported and skipped, never
guessed (D3 permits duplicate display names).

## Tolerant read + legacy ledger

`references.ts` keeps a name-based resolution path behind a `legacy:` marker with an entry
in `legacy-ledger.yaml` (`what`, `paths`, `why`, `removal`, `owner`). The guard
`scripts/lib/legacy-ledger-guard.js` runs in `verify.js`.

## Reports

- **Detector report**: every reference/citation that would change, plus warnings.
- **Rewriter report**: every change applied, by document.

Both are artifacts (write-once), so re-running on an unchanged domain writes nothing.

## Snapshot citations

A citation target under `sources/archive/` is historical; it is reported as a warning and
NOT rewritten, so a domain never silently detaches from its history.

## Cross-cutting

`strict_tdd: true`; the migrator is covered by `migrate-domain.test.js`; the legacy-ledger
guard must stay green.
