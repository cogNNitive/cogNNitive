# Delta for quality-gates

## Modified Requirements

### Requirement: Manifest suites in deterministic verification

`scripts/verify.js` MUST dynamically discover and execute all conforming root test suites matching `*.test.js` and `*.test.mjs` (excluding `node_modules`), along with any explicitly registered non-conforming test runners, before reporting deterministic verification as successful.

(Previously: `scripts/verify.js` MUST execute the existing root manifest test suites before reporting deterministic verification as successful.)

#### Scenario: All manifest and script test suites run via dynamic discovery

- **GIVEN** `node scripts/verify.js` is invoked
- **WHEN** deterministic verification performs test suite discovery across root script and skill directories
- **THEN** it SHALL dynamically discover and execute all conforming files matching `*.test.js` and `*.test.mjs` (including root manifest test suites and `scripts/lib/shared-libs.test.js`) while excluding `node_modules`
- **AND** it SHALL execute explicitly registered non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`)
- **AND** any nonzero exit SHALL immediately fail deterministic verification.

#### Scenario: Existing manifest suites are not replaced

- **GIVEN** the discovered test suites
- **WHEN** they pass
- **THEN** the implementation SHALL NOT duplicate their assertions in `scripts/verify.js`.
