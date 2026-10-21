/**
 * scripts/release/assemble-manifest.js
 *
 * Assembles the stable agent-bootstrap manifest at release time (AD-4).
 * Pure function: combines the previous published manifest (from web clone),
 * tagged inventory, content commit SHA, and entry versions.
 */

const { parseFocusedYaml, parseFrontmatter } = require('../lib/yaml-parser.js');
const { parseReleaseTag } = require('./parse-release-tag.js');

class AssembleManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssembleManifestError';
  }
}

/** Finds a previous console asset by its exact file name. */
function findPrevConsoleAsset(prevAssets, file) {
  return prevAssets.find((a) => a.file === file);
}

/** Finds a previous MCP entry by its exact name. */
function findPrevMcp(prevSkill, name) {
  return (prevSkill.mcp || []).find((pm) => pm.name === name);
}

function parseSemver(v) {
  const parts = String(v || '').replace(/^v/, '').split('.').map(Number);
  return parts.length === 3 && parts.every((n) => !isNaN(n)) ? parts : null;
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return String(v1).localeCompare(String(v2));
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

function q(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderNoteLines(note, indent) {
  if (!note) return '';
  return (
    note
      .split('\n')
      .map((line) => `${indent}# ${line}`)
      .join('\n') + '\n'
  );
}

function renderSkillEntry(skill) {
  const indent = '    ';
  let out = renderNoteLines(skill.note, indent);
  out += `${indent}- name: ${skill.name}\n`;
  out += `${indent}  repo: ${skill.repo}\n`;
  out += `${indent}  path: ${skill.path}\n`;
  out += `${indent}  version: ${q(skill.version)}\n`;
  out += `${indent}  ref: ${q(skill.ref)}\n`;
  out += `${indent}  commit: ${q(skill.commit)}\n`;
  if (skill.requires && skill.requires.length) {
    out += `${indent}  requires: [${skill.requires.join(', ')}]\n`;
  }
  out += `${indent}  description: ${skill.description}\n`;
  if (skill.blueprints && skill.blueprints.length) {
    out += `${indent}  blueprints: [${skill.blueprints.join(', ')}]\n`;
  }
  if (skill.mcp && skill.mcp.length) {
    out += `${indent}  mcp:\n`;
    for (const m of skill.mcp) {
      out += `${indent}    - name: ${m.name}\n`;
      out += `${indent}      repo: ${m.repo}\n`;
      out += `${indent}      path: ${m.path}\n`;
      if (m.version !== undefined && m.version !== null) {
        out += `${indent}      version: ${q(m.version)}\n`;
      }
      out += `${indent}      ref: ${q(m.ref)}\n`;
      out += `${indent}      commit: ${q(m.commit)}\n`;
      out += `${indent}      url: ${m.url}\n`;
    }
  }
  return out;
}

function renderBlueprintEntry(blueprint) {
  const indent = '    ';
  let out = renderNoteLines(blueprint.note, indent);
  out += `${indent}- name: ${blueprint.name}\n`;
  out += `${indent}  repo: ${blueprint.repo}\n`;
  out += `${indent}  path: ${blueprint.path}\n`;
  out += `${indent}  version: ${q(blueprint.version)}\n`;
  out += `${indent}  ref: ${q(blueprint.ref)}\n`;
  out += `${indent}  commit: ${q(blueprint.commit)}\n`;
  return out;
}

function renderConsoleAssetEntry(asset) {
  const indent = '    ';
  let out = `${indent}- file: ${asset.file}\n`;
  out += `${indent}  version: ${q(asset.version)}\n`;
  out += `${indent}  ref: ${q(asset.ref)}\n`;
  out += `${indent}  commit: ${q(asset.commit)}\n`;
  out += `${indent}  url: ${asset.url}\n`;
  return out;
}

function renderWorkflowEntry(wf) {
  const indent = '    ';
  let out = `${indent}- id: ${wf.id}\n`;
  out += `${indent}  label: ${wf.label}\n`;
  out += `${indent}  description: ${wf.description}\n`;
  if (wf.skill) out += `${indent}  skill: ${wf.skill}\n`;
  if (wf.blueprint) out += `${indent}  blueprint: ${wf.blueprint}\n`;
  return out;
}

function renderFrontmatter(model, channel = 'stable') {
  const titleSuffix = channel === 'preview' ? ' (preview)' : '';
  let out = '---\n';
  out += `title: "cogNNitive — Bootstrap manifest${titleSuffix}"\n`;
  out +=
    'description: "Canonical agent-bootstrap manifest served raw (Jekyll-safe) for https://cognnitive.com/use."\n';
  out += `channel: "${channel}"\n`;
  out += 'agent-bootstrap:\n';
  out += `  version: ${q(model.version)}\n`;
  out += `  entrypoint: ${q(model.entrypoint)}\n`;
  out += '  skills:\n';
  for (const s of model.skills) out += renderSkillEntry(s);
  out += '  blueprints:\n';
  for (const t of model.blueprints) out += renderBlueprintEntry(t);
  if (model.consoleAssets && model.consoleAssets.length) {
    out += '  console-assets:\n';
    for (const a of model.consoleAssets) out += renderConsoleAssetEntry(a);
  }
  out += '  workflows:\n';
  for (const w of model.workflows) out += renderWorkflowEntry(w);
  out += '---\n';
  return out;
}

function normalizeOutput(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + '\n';
}

function parseManifestDocument(text) {
  if (!text) return { frontmatter: {}, body: '' };
  const rawFm = parseFrontmatter(text);
  const parsed = parseFocusedYaml(rawFm);
  const body = text.replace(/^---[\s\S]*?---\r?\n?/, '').trim();
  const root = parsed['agent-bootstrap'] || parsed;
  return {
    version: root.version || '1.0.0',
    entrypoint: root.entrypoint || 'nn-router',
    skills: Array.isArray(root.skills) ? root.skills : [],
    blueprints: Array.isArray(root.blueprints) ? root.blueprints : Array.isArray(root.templates) ? root.templates : [],
    consoleAssets: Array.isArray(root['console-assets']) ? root['console-assets'] : [],
    workflows: Array.isArray(root.workflows) ? root.workflows : [],
    body,
  };
}

/**
 * Assembles the stable release manifest.
 *
 * @param {object} params
 * @param {string} params.releaseTag - e.g. 'skills-v2.10.0'
 * @param {string} params.contentSha - 40-char SHA of content commit C
 * @param {object} params.source - parsed source.yaml inventory
 * @param {string} params.prevManifestText - previous docs/use/manifest.md content
 * @param {Function} [params.readVersion] - (entry) => version string
 * @param {Function} [params.resolveGitRef] - (ref) => sha | true
 * @param {string} [params.body] - Markdown body
 * @returns {{ manifestText: string, snapshotPath: string, model: object }}
 */
function assembleManifest(params) {
  const { releaseTag, contentSha, source, prevManifestText, readVersion, resolveGitRef, body: customBody } = params;
  const { key, version: newVersion } = parseReleaseTag(releaseTag);
  const prev = parseManifestDocument(prevManifestText);

  // Check regression guard: find previous tag / version for this key in prev manifest
  let prevVersion = null;
  let prevRef = null;
  if (key === 'skills') {
    const s = prev.skills[0];
    if (s && s.ref) {
      prevRef = s.ref;
      const match = s.ref.match(/skills-v(\d+\.\d+\.\d+)/);
      if (match) prevVersion = match[1];
    }
  } else if (key === 'blueprints') {
    const b = prev.blueprints[0];
    if (b && b.ref) {
      prevRef = b.ref;
      const match = b.ref.match(/blueprints-v(\d+\.\d+\.\d+)/);
      if (match) prevVersion = match[1];
    }
  } else if (key === 'nn-mcp') {
    for (const s of prev.skills) {
      if (s.mcp && s.mcp[0] && s.mcp[0].ref) {
        prevRef = s.mcp[0].ref;
        const match = s.mcp[0].ref.match(/(?:nn|innfo)-mcp-v(\d+\.\d+\.\d+)/);
        if (match) {
          prevVersion = match[1];
          break;
        }
      }
    }
  } else if (key === 'nn-console') {
    const c = prev.consoleAssets[0];
    if (c && c.ref) {
      prevRef = c.ref;
      const match = c.ref.match(/(?:nn|innfo)-console-v(\d+\.\d+\.\d+)/);
      if (match) prevVersion = match[1];
    }
  }

  if (prevVersion) {
    const isSameTagRerun = prevRef === releaseTag;
    if (!isSameTagRerun && compareSemver(newVersion, prevVersion) <= 0) {
      throw new AssembleManifestError(
        `New tag version ${newVersion} is not strictly greater than previous manifest pin ${prevVersion} for key ${key} (Version below previous pin).`
      );
    }
  }

  // Validate retained pin resolution helper
  const verifyRetainedPin = (name, ref, commit) => {
    if (typeof resolveGitRef === 'function') {
      const resolved = resolveGitRef(ref);
      if (!resolved || (typeof resolved === 'string' && resolved !== commit)) {
        throw new AssembleManifestError(
          `Retained pin '${name}' ref '${ref}' does not resolve to commit '${commit}' in repository clone.`
        );
      }
    }
  };

  // A retained entry with no previous pin would render as "undefined" and only fail later in validation.
  const requirePin = (kind, name, ref, commit) => {
    if (!ref || !commit) {
      throw new AssembleManifestError(
        `${kind} '${name}' has no previous pin in the published manifest, so release '${releaseTag}' cannot retain it. Release its own key first (skills-v*, blueprints-v*, nn-mcp-v*).`
      );
    }
  };

  const model = {
    version: source.version || prev.version || '1.0.0',
    entrypoint: source.entrypoint || prev.entrypoint || 'nn-router',
    skills: [],
    blueprints: [],
    consoleAssets: [],
    workflows: source.workflows || prev.workflows || [],
  };

  // 1. Skills
  for (const skill of source.skills || []) {
    const prevSkill = prev.skills.find((s) => s.name === skill.name) || {};
    let sRef, sCommit, sVersion;

    if (key === 'skills') {
      sRef = releaseTag;
      sCommit = contentSha;
      sVersion = readVersion ? readVersion({ ...skill, section: 'skills' }) : skill.version || newVersion;
    } else {
      sRef = prevSkill.ref;
      sCommit = prevSkill.commit;
      sVersion = prevSkill.version;
      requirePin('Skill', skill.name, sRef, sCommit);
      verifyRetainedPin(skill.name, sRef, sCommit);
    }

    const mcp = [];
    for (const m of skill.mcp || []) {
      const prevMcp = findPrevMcp(prevSkill, m.name) || {};
      let mRef, mCommit, mVersion, mUrl, mPath;

      if (key === 'nn-mcp') {
        mPath = m.path;
        mRef = releaseTag;
        mCommit = contentSha;
        mVersion = readVersion ? readVersion({ ...m, section: 'mcp' }) : m.version || newVersion;
        mUrl = `https://raw.githubusercontent.com/${m.repo}/${contentSha}/${m.path}`;
      } else {
        mRef = prevMcp.ref;
        mCommit = prevMcp.commit;
        mVersion = prevMcp.version;
        // A retained pin keeps the path it was PUBLISHED with. The raw URL is
        // `commit + path`, and the manifest pins the content commit of that release:
        // substituting the path source.yaml declares today would request a file that
        // did not exist at that commit (404). The path moves when the key itself is
        // released, together with its name.
        mPath = prevMcp.path || m.path;
        mUrl = prevMcp.url || (mRef && mCommit ? `https://raw.githubusercontent.com/${m.repo}/${mCommit}/${mPath}` : undefined);
        requirePin('MCP', m.name, mRef, mCommit);
        verifyRetainedPin(m.name, mRef, mCommit);
      }

      mcp.push({
        name: m.name,
        repo: m.repo,
        path: mPath,
        version: mVersion,
        ref: mRef,
        commit: mCommit,
        url: mUrl,
      });
    }

    model.skills.push({
      name: skill.name,
      repo: skill.repo,
      path: skill.path,
      version: sVersion,
      ref: sRef,
      commit: sCommit,
      requires: skill.requires,
      description: skill.description,
      blueprints: skill.blueprints,
      note: skill.note,
      mcp,
    });
  }

  // 2. Blueprints
  for (const blueprint of source.blueprints || []) {
    const prevBp = prev.blueprints.find((b) => b.name === blueprint.name) || {};
    let bRef, bCommit, bVersion;

    if (key === 'blueprints') {
      bRef = releaseTag;
      bCommit = contentSha;
      bVersion = readVersion ? readVersion({ ...blueprint, section: 'blueprints' }) : blueprint.version || newVersion;
    } else {
      bRef = prevBp.ref;
      bCommit = prevBp.commit;
      bVersion = prevBp.version;
      requirePin('Blueprint', blueprint.name, bRef, bCommit);
      verifyRetainedPin(blueprint.name, bRef, bCommit);
    }

    model.blueprints.push({
      name: blueprint.name,
      repo: blueprint.repo,
      path: blueprint.path,
      version: bVersion,
      ref: bRef,
      commit: bCommit,
      note: blueprint.note,
    });
  }

  // 3. Console Assets
  for (const asset of source.consoleAssets || []) {
    const prevAsset = findPrevConsoleAsset(prev.consoleAssets, asset.file) || {};
    let aRef, aCommit, aVersion, aUrl, aFile;

    if (key === 'nn-console') {
      aFile = asset.file;
      aRef = releaseTag;
      aCommit = contentSha;
      aVersion = readVersion ? readVersion({ ...asset, section: 'console' }) : asset.version || newVersion;
      aUrl = `https://raw.githubusercontent.com/${asset.repo}/${contentSha}/${asset.file}`;
    } else {
      if (!prevAsset.ref || !prevAsset.commit) {
        throw new AssembleManifestError(
          `Console asset '${asset.file}' has no previous pin in the published manifest, so release '${releaseTag}' cannot retain it. Cut an nn-console release (nn-console-v*) that carries this asset before any other release.`
        );
      }
      aRef = prevAsset.ref;
      aCommit = prevAsset.commit;
      aVersion = prevAsset.version;
      // Retained verbatim (design D3): until this asset ships under its new name in its own
      // release, the published entry keeps the previous file name and URL byte-identically.
      aFile = prevAsset.file;
      aUrl = prevAsset.url || (aRef && aCommit ? `https://raw.githubusercontent.com/${asset.repo}/${aCommit}/${aFile}` : undefined);
      if (aRef && aCommit) {
        verifyRetainedPin(aFile, aRef, aCommit);
      }
    }

    model.consoleAssets.push({
      file: aFile,
      version: aVersion,
      ref: aRef,
      commit: aCommit,
      url: aUrl,
    });
  }

  const bodyContent = customBody !== undefined ? customBody : prev.body ? `\n${prev.body}` : '';
  const frontmatter = renderFrontmatter(model, 'stable');
  const manifestText = normalizeOutput(`${frontmatter}${bodyContent}`);
  const snapshotPath = `docs/use/manifests/${releaseTag}.md`;

  return {
    manifestText,
    snapshotPath,
    model,
  };
}

module.exports = {
  assembleManifest,
  AssembleManifestError,
};
