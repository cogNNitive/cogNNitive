#!/usr/bin/env node
/**
 * scripts/lib/lineage-drift-guard.js
 *
 * Site (2) of the lineage drift gate. Runs the one core comparator over ONE
 * committed fixture domaiNN under the innfo-core tests fixtures, so a change to
 * the projection, the renderer, or the managed-section definitions that is not
 * reflected in the committed record turns `scripts/verify.js` red.
 *
 * It never scans `_samples_nn/` or shipped template bytes (they carry no record
 * and must not gain one), and it is read-only. Core comes from the committed
 * trannsform mirror, which a separate verify step keeps fresh.
 *
 * To refresh the fixture record after an intended projection change, run
 * `node skills/nn-sources/scripts/index.js --src <fixture> --lineage`
 * and keep the record file name.
 */

const path = require('node:path');

const GUARD_FIXTURE_ROOT = 'iNNfo/packages/innfo-core/tests/fixtures/';
const FIXTURE_DOMAIN = `${GUARD_FIXTURE_ROOT}lineage-drift-domain`;

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string} [options.domainDir] absolute domaiNN directory (default: the committed fixture)
 * @returns {{ ok: boolean, errors: string[], notice?: string }}
 */
function checkLineageDriftGuard(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const domainDir = options.domainDir || path.join(repoRoot, FIXTURE_DOMAIN);

  // Inside the repo only the committed core-tests fixtures may be checked.
  const relToRepo = path.relative(repoRoot, domainDir).split(path.sep).join('/');
  const insideRepo = relToRepo !== '' && !relToRepo.startsWith('..') && !path.isAbsolute(relToRepo);
  if (insideRepo && !`${relToRepo}/`.startsWith(GUARD_FIXTURE_ROOT)) {
    return { ok: false, errors: [`Refusing to scan ${relToRepo}: only a domaiNN under ${GUARD_FIXTURE_ROOT} may be checked.`] };
  }

  const {
    readLineageSnapshot,
    readLineageRecord,
    projectLineage,
    renderLineageSections,
    checkLineageDrift,
  } = require(path.join(repoRoot, 'skills', 'nn-sources', 'scripts', 'lib', 'innfo-core.generated.cjs'));

  const label = insideRepo ? relToRepo : domainDir;
  const record = readLineageRecord(domainDir);
  if (!record) {
    return { ok: false, errors: [`No lineage record in the fixture ${label}: the guard would prove nothing.`] };
  }

  const rendered = renderLineageSections(projectLineage(readLineageSnapshot(domainDir)));
  const result = checkLineageDrift(record.content, rendered);
  if (result.ok) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: result.diffs.map((d) => `Lineage drift in ${label}/${record.path}, ${d.section}: ${d.firstDiff}`),
  };
}

if (require.main === module) {
  const result = checkLineageDriftGuard();
  if (!result.ok) {
    console.error('❌ Lineage Drift Guard failed:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log(`▶ Lineage Drift Guard: the managed sections of ${FIXTURE_DOMAIN} equal a fresh projection.`);
}

module.exports = { checkLineageDriftGuard, FIXTURE_DOMAIN, GUARD_FIXTURE_ROOT };
