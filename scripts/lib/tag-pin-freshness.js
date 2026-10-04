/**
 * scripts/lib/tag-pin-freshness.js
 *
 * Group 1c — Tag/pin freshness for skills & blueprint changes.
 *
 * A change that touches a distributed skill or a Level-2 blueprint spec MUST
 * also touch `manifest/source.yaml` in the SAME diff, so the published manifest
 * pins the new content. Cutting the actual tag stays the maintainer's job; this
 * guard only catches the local half (the unpinned manifest).
 *
 * Expediente: 2026-09-24 — a skill rename plus `*_version` bumps across ~15
 * spec files were merged `dev → main` without re-pinning `manifest/source.yaml`;
 * `validate-manifest.js --channel stable` failed on CI afterward.
 *
 * Pure and git-free: the caller supplies the changed-file list, so the rule is
 * unit-testable without a repository.
 */

const MANIFEST_PATH = 'manifest/source.yaml';

/** Paths that require a manifest re-pin when changed. */
const SKILL_RE = /^skills\//;
const BLUEPRINT_SPEC_RE = /^iNNfo\/specs\/(?:bluepriNNts|templates)\/[^/]+\/spec_NN\.md$/;

/**
 * @param {string[]} changedFiles repo-relative POSIX paths (unsorted, any case)
 * @returns {{ ok: boolean, triggered: { skills: string[], blueprints: string[] }, manifestTouched: boolean, errors: string[] }}
 */
function checkTagPinFreshness(changedFiles) {
  const files = (changedFiles || []).map((f) => String(f).replace(/\\/g, '/'));

  const skills = files.filter((f) => SKILL_RE.test(f));
  const blueprints = files.filter((f) => BLUEPRINT_SPEC_RE.test(f));
  const manifestTouched = files.some((f) => f === MANIFEST_PATH);

  const triggered = { skills, blueprints };
  const hasTrigger = skills.length > 0 || blueprints.length > 0;
  const errors = [];

  if (hasTrigger && !manifestTouched) {
    const categories = [];
    if (skills.length) categories.push(`skills (${skills.length})`);
    if (blueprints.length) categories.push(`blueprints (${blueprints.length})`);
    const sample = [...skills, ...blueprints].slice(0, 5).join(', ');
    errors.push(
      `Changed ${categories.join(' and ')} without re-pinning ${MANIFEST_PATH} in the same diff ` +
        `(matched: ${sample}${skills.length + blueprints.length > 5 ? ', …' : ''}). ` +
        `Run the release/sync step to re-pin the manifest, or add the change to the same batch.`,
    );
  }

  return { ok: errors.length === 0, triggered, manifestTouched, errors };
}

module.exports = { checkTagPinFreshness, MANIFEST_PATH };
