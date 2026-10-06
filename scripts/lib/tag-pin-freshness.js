/**
 * scripts/lib/tag-pin-freshness.js
 *
 * Group 1c — Tag/pin freshness for skills & blueprint changes.
 *
 * A change that adds, removes or renames a distributed skill, or touches a
 * Level-2 blueprint spec, MUST also touch `manifest/source.yaml` in the SAME
 * diff, so the published manifest inventories/pins it. Cutting the actual tag stays the maintainer's job; this
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

/**
 * A skill needs a manifest re-pin only when the INVENTORY changes: its `SKILL.md`
 * was added, removed, or renamed. Content edits do not — `manifest/source.yaml`
 * carries no per-skill version (versions are derived from each `SKILL.md` by
 * `sync-versions` and the release workflow), and skills-v2.13.0/2.13.1 shipped
 * without touching it.
 */
const SKILL_MARKER_RE = /^skills\/[^/]+\/SKILL\.md$/;
/** Blueprint spec changes of any kind still require a re-pin. */
const BLUEPRINT_SPEC_RE = /^iNNfo\/specs\/(?:bluepriNNts|templates)\/[^/]+\/spec_NN\.md$/;

const normalize = (list) => (list || []).map((f) => String(f).replace(/\\/g, '/'));

/**
 * Paths whose git status is Added, Deleted or Renamed, from `git diff --name-status`
 * output (renames contribute both the old and the new path).
 * @param {string} nameStatus
 * @returns {string[]}
 */
function structuralChanges(nameStatus) {
  const paths = [];
  for (const line of String(nameStatus || '').split('\n')) {
    const [status, ...rest] = line.trim().split('\t');
    if (status && /^[ADR]/.test(status)) paths.push(...rest);
  }
  return paths;
}

/**
 * @param {string[]} changedFiles repo-relative POSIX paths (unsorted, any case)
 * @param {string[]} [structural] the subset that was added/deleted/renamed
 *   (see `structuralChanges`); defaults to `changedFiles`, i.e. treat every change as structural
 * @returns {{ ok: boolean, triggered: { skills: string[], blueprints: string[] }, manifestTouched: boolean, errors: string[] }}
 */
function checkTagPinFreshness(changedFiles, structural = changedFiles) {
  const files = normalize(changedFiles);

  const skills = normalize(structural).filter((f) => SKILL_MARKER_RE.test(f));
  const blueprints = files.filter((f) => BLUEPRINT_SPEC_RE.test(f));
  const manifestTouched = files.some((f) => f === MANIFEST_PATH);

  const triggered = { skills, blueprints };
  const hasTrigger = skills.length > 0 || blueprints.length > 0;
  const errors = [];

  if (hasTrigger && !manifestTouched) {
    const categories = [];
    if (skills.length) categories.push(`skills added/removed/renamed (${skills.length})`);
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

module.exports = { checkTagPinFreshness, structuralChanges, MANIFEST_PATH };
