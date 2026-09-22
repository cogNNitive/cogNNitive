# Tasks: Preflight Spec Freshness Identity Guard

- [x] 1. RED — add tests to `skills/nn-preflight/scripts/preflight-check.test.js`:
  - a specialization whose `parent_spec.url` points at a different document is
    skipped (not `stale`) and the run exits 0;
  - a file whose `spec_url` names a different document is skipped;
  - a genuine cache whose `spec_url` names the file itself is still compared.
  Verify (fails): `node skills/nn-preflight/scripts/preflight-check.test.js`
- [x] 2. GREEN — `skills/nn-preflight/scripts/preflight-check.js`: use only
  `fm.spec_url` as the comparison URL and add the self-identity guard
  (`urlIdentifiesLocalFile`); update the 5/6 fixtures to self-identifying remotes.
- [x] 3. GREEN — non-destructive remediation text in the human report.
- [x] 4. Verify — `node skills/nn-preflight/scripts/preflight-check.test.js` and
  `node scripts/check-integrity.js` green; re-run against the arenzano workspace:
  `specsStale` 18 → 6, and the 6 remaining are genuine self-identifying caches
  (`business_V_0-1-0`, `defiNNe_V_0-1-0`, `iNNfo_V_0-1-0`, `procedures_NN`,
  `procedures_V_0-1-0`, `projects_V_0-1-0`) — no specialization misreported.
- [ ] 5. Commit — `fix(nn-preflight): only hash-compare a spec against its own canonical URL`.
