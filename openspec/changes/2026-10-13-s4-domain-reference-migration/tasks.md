# Tasks: S4 — domain reference migration

`strict_tdd: true`: each group leads with its test.

## 1. Detector

- [ ] 1.1 TEST: the detector lists every name-based reference/citation and flags
      snapshot citations.
- [ ] 1.2 Build the `name -> slug` map from the frozen slugs.

## 2. Rewriter

- [ ] 2.1 TEST: a `[[Name]]` reference becomes the target slug; an ambiguous name is
      reported, not rewritten.
- [ ] 2.2 Rewrite `reference` fields, matrix headers and cross-model references.
- [ ] 2.3 Rewrite citations to the current grammar.

## 3. Retired blocks/ledgers

- [ ] 3.1 TEST: Agent Modification blocks and `feedback-ledger.jsonl` are removed by the
      migrator.
- [ ] 3.2 Warn (never rewrite) a `sources/archive/` citation.

## 4. Legacy read + ledger

- [ ] 4.1 Keep the name-based read behind a `legacy:` marker; add the
      `legacy-ledger.yaml` entry.
- [ ] 4.2 Confirm `node scripts/lib/legacy-ledger-guard.js` is green.

## 5. Verification

- [ ] 5.1 `node scripts/verify.js` + the nn-upgrade test suite.
- [ ] 5.2 Re-run the migrator on a migrated domain → no-op (write-once).
