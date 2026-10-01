# Delta for quality-gates

## MODIFIED Requirements

### Requirement: Manifest suites in deterministic verification

`scripts/verify.js` MUST dynamically discover and execute all conforming root test suites matching `*.test.js` and `*.test.mjs` (excluding `node_modules`), along with any explicitly registered non-conforming test runners, before reporting deterministic verification as successful. The verification MUST run the full roster and report the complete set of failures before exiting non-zero; it SHALL NOT stop at the first failing suite. (Previously: any nonzero exit SHALL immediately fail deterministic verification.)

#### Scenario: All manifest and script test suites run via dynamic discovery

- GIVEN `node scripts/verify.js` is invoked
- WHEN deterministic verification performs test suite discovery across root script and skill directories
- THEN it SHALL dynamically discover and execute all conforming files matching `*.test.js` and `*.test.mjs` (including root manifest test suites and `scripts/lib/shared-libs.test.js`) while excluding `node_modules`
- AND it SHALL execute explicitly registered non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`).

#### Scenario: Existing manifest suites are not replaced

- GIVEN the discovered test suites
- WHEN they pass
- THEN the implementation SHALL NOT duplicate their assertions in `scripts/verify.js`.

#### Scenario: Every failure is reported before exit

- GIVEN `node scripts/verify.js` is invoked and more than one discovered suite fails
- WHEN verification completes the roster
- THEN it SHALL report every failing suite in a single run
- AND it SHALL exit non-zero only after the full roster has executed.
