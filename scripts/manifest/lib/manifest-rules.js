/**
 * scripts/manifest/lib/manifest-rules.js
 *
 * Domain validation rules for the agent-bootstrap manifest.
 * Enforces structural integrity, git ref & release provenance policies,
 * repository commit existence, path content presence, and dependency closures.
 *
 * Zero external dependencies — native Node.js execution.
 */

const { parseFocusedYaml, parseFrontmatter } = require('../../lib/yaml-parser.js');
const {
  apiRequest,
  fetchString,
  resolveRef,
  rateLimited,
  RATE_LIMIT_HINT,
} = require('../../lib/github-client.js');

const COMMIT_RE = /^[0-9a-f]{40}$/i;
const TAG_SHAPE_RE = /^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/;

/**
 * Channel policy — data, not branching. Adding a channel is adding a table row.
 * @type {Record<string, {
 *   name: string,
 *   file: string,
 *   requiredRefKind: 'tag' | 'branch',
 *   requireTagShape: boolean,
 *   requireProvenance: boolean,
 * }>}
 */
const CHANNELS = {
  stable: {
    name: 'stable',
    file: 'docs/use/manifest.md',
    requiredRefKind: 'tag',
    requireTagShape: true,
    requireProvenance: true,
  },
  preview: {
    name: 'preview',
    file: 'docs/use/manifest-next.md',
    requiredRefKind: 'branch',
    requireTagShape: false,
    requireProvenance: false,
  },
};

/**
 * Checks if a tag shape conforms to repository snapshot conventions (e.g. 'skills-v1.0.0').
 * @param {{ name: string, ref?: string }} entry
 * @returns {string | null}
 */
function tagShapeViolation(entry) {
  if (!TAG_SHAPE_RE.test(entry.ref || '')) {
    return `${entry.name}: ref '${entry.ref}' does not match the repo-snapshot tag shape (expected e.g. 'skills-v1.0.0')`;
  }
  return null;
}

/**
 * Validates resolved ref kind against channel policy requirements.
 * @param {{ name: string, ref?: string }} entry
 * @param {'tag' | 'branch' | null} resolvedKind
 * @param {{ name: string, requiredRefKind: string }} policy
 * @returns {string | null}
 */
function refKindViolation(entry, resolvedKind, policy) {
  if (resolvedKind && resolvedKind !== policy.requiredRefKind) {
    return `${entry.name}: ref '${entry.ref}' resolves as a ${resolvedKind}, but the ${policy.name} channel requires a ${policy.requiredRefKind}`;
  }
  return null;
}

/**
 * Checks release provenance verifying commit reachability from main.
 * @param {string} repo
 * @param {string} commit
 * @returns {Promise<string | null>}
 */
async function checkReleaseProvenance(repo, commit) {
  const res = await apiRequest(`https://api.github.com/repos/${repo}/compare/main...${commit}`);
  if (res.status === 200 && res.data && res.data.status) {
    if (res.data.status === 'identical' || res.data.status === 'behind') return null;
    return `commit ${commit} in ${repo} is not reachable from main (compare status: '${res.data.status}') — orphan or unmerged tip cannot ship on the stable channel`;
  }
  if (rateLimited(res.status)) {
    return `rate limit hit checking release provenance for ${commit} in ${repo} (HTTP ${res.status}); ${RATE_LIMIT_HINT}`;
  }
  return `could not verify release provenance for ${commit} in ${repo} (HTTP ${res.status || res.error || 'network error'})`;
}

/**
 * Checks whether a ref resolves to the expected commit SHA in the declared repo.
 * @param {{ name: string, repo: string, ref: string, commit: string }} item
 * @returns {Promise<{ violation: string | null, kind: 'tag' | 'branch' | null }>}
 */
async function checkRefResolvesInDeclaredRepo(item) {
  const resolved = await resolveRef(item.repo, item.ref);
  if ('error' in resolved) return { violation: `${item.name}: ${resolved.error}`, kind: null };
  if (resolved.sha !== item.commit) {
    return {
      violation: `${item.name}: ref '${item.ref}' resolves to ${resolved.sha} in ${item.repo}, but manifest pins commit ${item.commit} (mismatch)`,
      kind: resolved.kind,
    };
  }
  return { violation: null, kind: resolved.kind };
}

/**
 * Evaluates release provenance and git ref constraints for a manifest entry against channel policy.
 * @param {{ name: string, repo: string, ref: string, commit: string }} item
 * @param {typeof CHANNELS[string]} policy
 * @returns {Promise<string[]>}
 */
async function checkReleaseAndRefPolicy(item, policy) {
  const violations = [];

  const { violation: refViolation, kind: resolvedKind } = await checkRefResolvesInDeclaredRepo(item);
  if (refViolation) violations.push(refViolation);

  const kindViolation = refKindViolation(item, resolvedKind, policy);
  if (kindViolation) violations.push(kindViolation);

  if (policy.requireTagShape) {
    const shapeViolation = tagShapeViolation(item);
    if (shapeViolation) violations.push(shapeViolation);
  }

  if (policy.requireProvenance) {
    const provenanceViolation = await checkReleaseProvenance(item.repo, item.commit);
    if (provenanceViolation) violations.push(`${item.name}: ${provenanceViolation}`);
  }

  return violations;
}

/**
 * Validates presence of required fields and commit SHA formatting.
 * @param {Record<string, any>} item
 * @returns {string[]}
 */
function structuralViolations(item) {
  const violations = [];
  for (const field of ['name', 'repo', 'path', 'version', 'ref', 'commit']) {
    if (!item[field]) violations.push(`${item.name || '(unnamed item)'}: missing field '${field}'`);
  }
  if (item.commit && !COMMIT_RE.test(item.commit)) {
    violations.push(`${item.name}: commit '${item.commit}' is not a 40-char hex sha`);
  }
  return violations;
}

/**
 * Checks if the pinned commit exists in declared repository.
 * @param {{ name: string, repo: string, commit: string }} item
 * @returns {Promise<string | null>}
 */
async function checkCommitExists(item) {
  const res = await apiRequest(`https://api.github.com/repos/${item.repo}/commits/${item.commit}`);
  if (res.status === 200) return null;
  if (rateLimited(res.status)) {
    return `${item.name}: GitHub API rate limit hit (HTTP ${res.status}) while checking commit; ${RATE_LIMIT_HINT}.`;
  }
  if (res.status === 422) {
    // GitHub returns 422 when the SHA is well-formed but does not resolve within
    // this repo — the signature of a commit that belongs to a different repo in
    // the same fork network.
    return `${item.name}: commit ${item.commit} does not belong to declared repo ${item.repo} (HTTP 422 — wrong repo)`;
  }
  return `${item.name}: commit ${item.commit} does not exist in ${item.repo} (HTTP ${res.status || res.error || 'network error'})`;
}

/**
 * Checks if SKILL.md exists in repo at path for the given commit.
 * @param {{ name: string, repo: string, path: string, commit: string }} skill
 * @returns {Promise<string | null>}
 */
async function checkPathAtCommit(skill) {
  const url = `https://api.github.com/repos/${skill.repo}/contents/${skill.path}?ref=${skill.commit}`;
  const res = await apiRequest(url);
  if (res.status === 200) {
    if (Array.isArray(res.data) && res.data.some(entry => entry.name === 'SKILL.md')) return null;
    return `${skill.name}: ${skill.path} at ${skill.commit} has no SKILL.md entry`;
  }
  if (rateLimited(res.status)) {
    return `${skill.name}: GitHub API rate limit hit (HTTP ${res.status}) while checking path; ${RATE_LIMIT_HINT}.`;
  }
  return `${skill.name}: path ${skill.path} not found at ${skill.commit} (HTTP ${res.status || res.error || 'network error'})`;
}

/**
 * Verifies version parity between manifest and remote SKILL.md frontmatter.
 * @param {{ name: string, repo: string, path: string, commit: string, version: string }} skill
 * @returns {Promise<string | { bundled_templates: any[] }>}
 */
async function checkVersionParity(skill) {
  const url = `https://raw.githubusercontent.com/${skill.repo}/${skill.commit}/${skill.path}/SKILL.md`;
  let text;
  try {
    text = await fetchString(url);
  } catch (err) {
    return `${skill.name}: could not fetch SKILL.md at ${skill.commit} (${err.message})`;
  }
  const meta = parseFocusedYaml(parseFrontmatter(text));
  const declared = meta.version !== undefined ? meta.version : (meta.metadata && meta.metadata.version);
  if (declared === undefined || declared === null) {
    return `${skill.name}: SKILL.md at ${skill.commit} declares no version`;
  }
  if (String(declared) !== String(skill.version)) {
    return `${skill.name}: version mismatch — manifest '${skill.version}' vs SKILL.md '${declared}'`;
  }
  return { bundled_templates: meta.bundled_templates || [] };
}

/**
 * Checks that an MCP bundle URL is pinned to its commit SHA rather than floating on main.
 * @param {{ name: string, commit?: string, url?: string }} entry
 * @returns {Promise<string | null>}
 */
async function checkMcpUrlPinned(entry) {
  if (!entry.commit || !COMMIT_RE.test(entry.commit)) return null; // structural check already caught this
  if (/\/main\//.test(entry.url || '')) {
    return `${entry.name}: mcp url references a branch ('/main/') instead of a pinned commit`;
  }
  if (!entry.url || !entry.url.includes(`/${entry.commit}/`)) {
    return `${entry.name}: mcp url is not pinned to its resolved commit (expected to contain '/${entry.commit}/')`;
  }
  return null;
}

/**
 * Validates an MCP server bundle entry against structural, existence, and channel policies.
 * @param {{ name: string, repo: string, path: string, version: string, ref: string, commit: string, url?: string }} entry
 * @param {typeof CHANNELS[string]} policy
 * @returns {Promise<string[]>}
 */
async function validateMcp(entry, policy) {
  const violations = structuralViolations(entry);
  if (violations.length > 0) return violations;

  const commitViolation = await checkCommitExists(entry);
  if (commitViolation) violations.push(commitViolation);

  violations.push(...await checkReleaseAndRefPolicy(entry, policy));

  const urlViolation = await checkMcpUrlPinned(entry);
  if (urlViolation) violations.push(urlViolation);

  return violations;
}

/**
 * Validates a skill entry including structure, commit existence, ref policies, path, and version.
 * @param {{
 *   name: string,
 *   repo: string,
 *   path: string,
 *   version: string,
 *   ref: string,
 *   commit: string,
 *   mcp?: any[],
 *   requires?: string[],
 *   templates?: string[],
 * }} skill
 * @param {typeof CHANNELS[string]} policy
 * @returns {Promise<{ violations: string[], bundled_templates: any[] }>}
 */
async function validateSkill(skill, policy) {
  const violations = structuralViolations(skill);
  let bundled_templates = [];
  if (violations.length > 0) return { violations, bundled_templates };

  const commitViolation = await checkCommitExists(skill);
  if (commitViolation) violations.push(commitViolation);

  violations.push(...await checkReleaseAndRefPolicy(skill, policy));

  const pathViolation = await checkPathAtCommit(skill);
  if (pathViolation) violations.push(pathViolation);

  const versionResult = await checkVersionParity(skill);
  if (typeof versionResult === 'string') {
    violations.push(versionResult);
  } else if (versionResult && versionResult.bundled_templates) {
    bundled_templates = versionResult.bundled_templates;
  }

  for (const mcp of (skill.mcp || [])) {
    violations.push(...await validateMcp(mcp, policy));
  }

  return { violations, bundled_templates };
}

/**
 * Validates a template entry against manifest policy rules and remote repo content.
 * @param {{ name: string, repo: string, path: string, version: string, ref: string, commit: string }} template
 * @param {typeof CHANNELS[string]} policy
 * @returns {Promise<string[]>}
 */
async function validateTemplate(template, policy) {
  const violations = structuralViolations(template);
  if (violations.length > 0) return violations;

  const commitViolation = await checkCommitExists(template);
  if (commitViolation) violations.push(commitViolation);

  violations.push(...await checkReleaseAndRefPolicy(template, policy));

  const url = `https://api.github.com/repos/${template.repo}/contents/${template.path}?ref=${template.commit}`;
  const res = await apiRequest(url);
  if (res.status !== 200) {
    if (rateLimited(res.status)) {
      violations.push(`${template.name}: GitHub API rate limit hit (HTTP ${res.status}) while checking path; ${RATE_LIMIT_HINT}.`);
    } else {
      violations.push(`${template.name}: path ${template.path} not found at ${template.commit} (HTTP ${res.status || res.error || 'network error'})`);
    }
  }

  const rawUrl = `https://raw.githubusercontent.com/${template.repo}/${template.commit}/${template.path}`;
  try {
    const text = await fetchString(rawUrl);
    let declared = null;
    try {
      const meta = parseFocusedYaml(parseFrontmatter(text));
      declared = meta.version !== undefined ? meta.version : (meta.spec_version !== undefined ? meta.spec_version : (meta.metadata && meta.metadata.version));
    } catch {
      const versionMatch = text.match(/V_\d+-\d+-\d+/i) || text.match(/version:\s*["']?([^"'\r\n]+)/i);
      if (versionMatch) declared = versionMatch[1] || versionMatch[0];
    }
    if (declared === undefined || declared === null) {
      violations.push(`${template.name}: template at ${template.commit} declares no version`);
    } else if (String(declared) !== String(template.version)) {
      violations.push(`${template.name}: version mismatch — manifest '${template.version}' vs template '${declared}'`);
    }
  } catch (err) {
    violations.push(`${template.name}: could not fetch template at ${template.commit} (${err.message})`);
  }

  return violations;
}

/**
 * Checks skill dependency closure (requires) and template closure across skills and workflows.
 * @param {{
 *   skills?: any[],
 *   templates?: any[],
 *   workflows?: any[],
 * }} manifestData
 * @param {Iterable<string>} [bundledTemplateNames=[]]
 * @returns {string[]}
 */
function checkClosureViolations(manifestData, bundledTemplateNames = []) {
  const { skills = [], templates = [], workflows = [] } = manifestData;
  const violations = [];
  const knownSkills = new Set(skills.map(s => s.name));
  const knownTemplates = new Set([...templates.map(t => t.name), ...bundledTemplateNames]);

  // Skill dependency closure (requires)
  for (const skill of skills) {
    for (const req of (skill.requires || [])) {
      if (!knownSkills.has(req)) {
        violations.push(`${skill.name}: requires '${req}' which is not in the manifest`);
      }
    }
    for (const tmpl of (skill.templates || [])) {
      if (!knownTemplates.has(tmpl)) {
        violations.push(`${skill.name}: references template '${tmpl}' which is not declared in top-level templates or bundled`);
      }
    }
  }

  // Workflow template dependency closure
  for (const wf of workflows) {
    if (wf.template && !knownTemplates.has(wf.template)) {
      violations.push(`workflow '${wf.id || wf.label}': references template '${wf.template}' which is not declared in top-level templates or bundled`);
    }
  }

  return violations;
}

/**
 * Validates all skills, templates, mcp entries, and dependency closures of a manifest against a policy.
 * @param {{
 *   version?: string,
 *   entrypoint?: string,
 *   skills?: any[],
 *   templates?: any[],
 *   workflows?: any[],
 *   mcp?: any[],
 * }} manifestData
 * @param {typeof CHANNELS[string]} policy
 * @returns {Promise<{
 *   violations: string[],
 *   stats: { skillsCount: number, templatesCount: number, mcpCount: number },
 * }>}
 */
async function validateManifest(manifestData, policy) {
  const { skills = [], templates = [], workflows = [], mcp = [] } = manifestData;
  const mcpCount = mcp.length + skills.reduce((n, s) => n + ((s.mcp || []).length), 0);
  const violations = [];
  const knownSkillBundledTemplates = new Set();

  for (const skill of skills) {
    const { violations: skillViolations, bundled_templates } = await validateSkill(skill, policy);
    violations.push(...skillViolations);
    for (const bt of bundled_templates) {
      const name = typeof bt === 'string' ? bt : (bt && bt.name);
      if (name) knownSkillBundledTemplates.add(name);
    }
  }

  for (const template of templates) {
    violations.push(...await validateTemplate(template, policy));
  }

  for (const mcpEntry of mcp) {
    violations.push(...await validateMcp(mcpEntry, policy));
  }

  const closureViolations = checkClosureViolations(manifestData, knownSkillBundledTemplates);
  violations.push(...closureViolations);

  return {
    violations,
    stats: {
      skillsCount: skills.length,
      templatesCount: templates.length,
      mcpCount,
    },
  };
}

module.exports = {
  COMMIT_RE,
  TAG_SHAPE_RE,
  CHANNELS,
  tagShapeViolation,
  refKindViolation,
  checkReleaseProvenance,
  checkRefResolvesInDeclaredRepo,
  checkReleaseAndRefPolicy,
  structuralViolations,
  checkCommitExists,
  checkPathAtCommit,
  checkVersionParity,
  checkMcpUrlPinned,
  validateMcp,
  validateSkill,
  validateTemplate,
  checkClosureViolations,
  validateManifest,
};
