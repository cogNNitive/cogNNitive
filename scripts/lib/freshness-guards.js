'use strict';

/**
 * Single list of the cheap (<1s each, offline) `--check` freshness guards for
 * committed derived artifacts. Shared by `scripts/verify.js` (full gate) and
 * `scripts/pre-push-check.js` (local push gate) so the two can never drift.
 *
 * `regen` is the exact command that rewrites the artifact; the pre-push gate
 * prints it on failure.
 *
 * @type {Array<{ id: string, desc: string, script: string, args: string[], regen: string }>}
 */
const FRESHNESS_GUARDS = [
  { id: 'preflight-primitives', desc: 'Check Preflight Primitives Bundle Fresh', script: 'scripts/build-preflight-primitives.mjs', args: ['--check'], regen: 'node scripts/build-preflight-primitives.mjs' },
  { id: 'skills-manager-bundle', desc: 'Check Skills Manager Bundle Fresh', script: 'scripts/build-skills-manager-bundle.mjs', args: ['--check'], regen: 'node scripts/build-skills-manager-bundle.mjs' },
  { id: 'skill-shared-rules', desc: 'Check Skill Shared Rules Fresh', script: 'scripts/build-skill-shared-rules.mjs', args: ['--check'], regen: 'node scripts/build-skill-shared-rules.mjs' },
  { id: 'blueprint-catalog', desc: 'Check Blueprint Catalog Fresh', script: 'scripts/blueprint-catalog.mjs', args: ['--check'], regen: 'node scripts/blueprint-catalog.mjs' },
  { id: 'core-mirror', desc: 'Check Trannsform Core Mirror Fresh', script: 'scripts/build-trannsform-core-mirror.mjs', args: ['--check'], regen: 'node scripts/build-trannsform-core-mirror.mjs' },
  { id: 'console-payload', desc: 'Check Console Payload Mirror Fresh', script: 'scripts/build-console-payload.mjs', args: ['--check'], regen: 'node scripts/build-console-payload.mjs' },
  { id: 'console-bundle', desc: 'Check Console Bundle Fresh', script: 'scripts/build-console-bundle.mjs', args: ['--check'], regen: 'node scripts/build-console-bundle.mjs' },
  { id: 'samples-parity', desc: 'Check Samples Parity with _samples_nn', script: 'scripts/sync-samples.mjs', args: ['--check'], regen: 'node scripts/sync-samples.mjs' },
  { id: 'version-parity', desc: 'Check Version Parity with Specs and Skills', script: 'scripts/sync-versions.mjs', args: ['--check'], regen: 'node scripts/sync-versions.mjs' },
  { id: 'console-shells-fresh', desc: 'Check Generated Console Shells Fresh', script: 'scripts/build-console-shells.mjs', args: ['--check'], regen: 'node scripts/build-console-shells.mjs' },
];

/**
 * @param {string} id
 * @returns {typeof FRESHNESS_GUARDS[number]}
 */
function freshnessGuard(id) {
  const guard = FRESHNESS_GUARDS.find((g) => g.id === id);
  if (!guard) throw new Error(`Unknown freshness guard: ${id}`);
  return guard;
}

module.exports = { FRESHNESS_GUARDS, freshnessGuard };
