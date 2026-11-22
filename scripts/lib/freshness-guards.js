'use strict';

/**
 * Single list of the cheap (<1s each, offline) `--check` freshness guards for
 * committed derived artifacts. `scripts/regen.js` runs every entry in write mode and
 * `scripts/pre-push-check.js` consumes the same list, so the two can never drift.
 *
 * `scripts/verify.js` no longer runs these one by one: it runs the single
 * `regen-gate` step (`npm run check:regen`), which regenerates every artifact and
 * fails on a non-empty diff. Keep this list complete anyway — it is what tells
 * `regen` *how* to rebuild each artifact, and the gate can only judge what the
 * pass wrote. `blueprint-catalog` is the one entry the gate cannot judge (its
 * `release_tag` encodes git tag state), so its own step stays in `verify.js`.
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
  { id: 'core-mirror', desc: 'Check Core Mirrors Fresh', script: 'scripts/build-core-mirrors.mjs', args: ['--check'], regen: 'node scripts/build-core-mirrors.mjs' },
  // Reads nn-core's parser through the coNNtent core mirror above, so it runs after it.
  { id: 'field-registry', desc: 'Check Field Registry Fresh', script: 'iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/build-field-registry.mjs', args: ['--check'], regen: 'node iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/build-field-registry.mjs' },
  { id: 'canonical-registry', desc: 'Check Canonical Registry Mirror Fresh', script: 'scripts/generate-canonical-registry.mjs', args: ['--check'], regen: 'node scripts/generate-canonical-registry.mjs' },
  // The bundle composes the address module, so the address module is rebuilt first.
  { id: 'address-module', desc: 'Check Address Module Bundle Fresh', script: 'scripts/export-address-module.mjs', args: ['--check'], regen: 'node scripts/export-address-module.mjs' },
  { id: 'console-payload', desc: 'Check Console Payload Mirror Fresh', script: 'scripts/build-console-payload.mjs', args: ['--check'], regen: 'node scripts/build-console-payload.mjs' },
  { id: 'console-bundle', desc: 'Check Console Bundle Fresh', script: 'scripts/build-console-bundle.mjs', args: ['--check'], regen: 'node scripts/build-console-bundle.mjs' },
  { id: 'mcp-bundle', desc: 'Check MCP Bundle Freshness', script: 'scripts/build-mcp-bundle.mjs', args: ['--check'], regen: 'node scripts/build-mcp-bundle.mjs' },
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
