# Proposal: S4 — domain reference migration (nn-upgrade)

## Intent

Slice S4 of `refactor/stable-identity-and-changesets` (D16). S1 froze element/concept
slugs and introduced the address grammar (`model_slug@element&field`), but existing
domains still carry **name-based structural references and citations**. `nn-upgrade`
must rewrite them to the slug grammar and remove the retired provenance blocks/ledgers,
leaving name-based reads marked as legacy until the migration runs. S4 depends only on
S1 and S2a (both archived), so it can proceed in parallel with S3.

## Scope

### In Scope
- `nn-upgrade` migrator: rewrite `reference` fields, matrix row/column headers and
  cross-model references to slugs; rewrite citations to the current grammar.
- Remove retired blocks (Agent Modification) and retired ledgers
  (`feedback-ledger.jsonl`).
- Keep the tolerant name-based read, marked `legacy:` and registered in
  `legacy-ledger.yaml`, until the migration has run.
- A detector report (what would change) and a rewriter report (what changed).

### Out of Scope
- The retired-block/ledger *code* removal (S2c).
- Migrating the console payload (the consolidated change).

## Capabilities

### Modified Capabilities
- `workspace-template-upgrade`: the reference/citation rewrite and retired-block removal.
- `cross-model-reference-validation`: reads slugs after migration, names tolerantly before.

## Approach

Extend `skills/nn-upgrade` (`migrate-domain.js`) with a rewrite pass: for each document,
resolve every name-based reference through the frozen slug map, rewrite it, and record the
change; scan for citations under `sources/archive/` and warn (never rewrite a snapshot
citation). The tolerant name read stays behind the `legacy:` marker so the run is
idempotent and a partially-migrated domain is readable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-upgrade/scripts/migrate-domain.js` | Modified | reference/citation rewrite |
| `skills/nn-upgrade/scripts/lib/*` | Modified | slug map + reports |
| `iNNfo/packages/innfo-core/src/references.ts` (or equivalent) | Read | name resolution for the map |
| `legacy-ledger.yaml` | Modified | the tolerant-read entry |
| `openspec/specs/workspace-template-upgrade/spec.md` | Modified | the rewrite requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A name resolves ambiguously | Med | Report it; do not rewrite; the user resolves |
| Rewriting a snapshot citation | Low | `sources/archive/` is warned, never rewritten |
| Partial migration leaves a mixed domain | Med | Tolerant read + idempotent re-run |

## Rollback Plan

The migrator writes a rewriter report and never touches `sources/archive/`. Revert is
per-document from git; test domains are throwaway.

## Success Criteria

- [ ] Structural references and citations in a migrated domain use slugs; the validator
      reports no name-based structural reference.
- [ ] Name-based reads are `legacy:`-marked and ledgered.
- [ ] A snapshot citation is warned, not rewritten.
- [ ] Re-running the migrator on a migrated domain is a no-op.
