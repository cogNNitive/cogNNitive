#!/usr/bin/env node

/**
 * scripts/manifest/generate-manifest.js
 *
 * Renders docs/use/manifest.md (stable) or docs/use/manifest-next.md (preview)
 * from a SHA-free hand-authored source: manifest/source.yaml (identity, paths,
 * single-source version reading) + manifest/body.md (prose).
 *
 * Preview channel refs default to 'main'.
 * Generation is deterministic and offline-friendly with injected ref resolver.
 *
 * Zero external dependencies. Requires Node >= 18.
 */

const fs = require('fs');
const path = require('path');
const {
  parseFocusedYaml,
  resolveRef: defaultResolveRef,
  CHANNELS,
} = require('./validate-manifest.js');
const { readEntryVersion } = require('./lib/entry-version.js');

// ---------------------------------------------------------------------------
// Source parsing
// ---------------------------------------------------------------------------

function resolveVersionForEntry(entry, section, repoRoot) {
  if (entry.version !== undefined && entry.version !== null && entry.version !== '') {
    return String(entry.version);
  }
  if (!repoRoot) return '0.0.0';
  const pList = section === 'skills'
    ? (entry.path ? [entry.path, 'SKILL.md'] : ['skills', entry.name || '', 'SKILL.md'])
    : section === 'blueprints'
      ? (entry.path ? [entry.path] : ['iNNfo', 'specs', entry.name || ''])
      : section === 'mcp'
        ? ['iNNfo', 'packages', 'nn-mcp', 'package.json']
        : ['iNNfo', 'specs', 'bluepriNNts', 'console', 'package.json'];
  const target = path.join(repoRoot, ...pList.filter(Boolean));
  if (fs.existsSync(target)) {
    const v = readEntryVersion({ section, content: fs.readFileSync(target, 'utf8') });
    if (v) return v;
  }
  return '0.0.0';
}

function parseSourceYaml(text, repoRoot = process.cwd()) {
  const doc = parseFocusedYaml(text);
  const channels = {};
  if (doc.channels && typeof doc.channels === 'object') {
    for (const ch of Object.keys(doc.channels)) {
      const channelObj = doc.channels[ch];
      const refs = [];
      if (channelObj && Array.isArray(channelObj.refs)) {
        for (const r of channelObj.refs) {
          let ref = r.ref;
          if (!ref && r.version) {
            ref = `${r.key}-v${r.version}`;
          }
          if (!ref) {
            if (r.key === 'nn-mcp') {
              for (const s of (doc.skills || [])) {
                for (const m of (s.mcp || [])) {
                  if (m.name === 'nn-mcp' && m.version) {
                    ref = `nn-mcp-v${m.version}`;
                    break;
                  }
                }
              }
            } else if (r.key === 'nn-console') {
              for (const c of (doc.console_assets || [])) {
                if (c.name === 'nn-console' && c.version) {
                  ref = `nn-console-v${c.version}`;
                  break;
                }
              }
            } else if (r.key === 'blueprints' || r.key === 'templates') {
              for (const b of (doc.blueprints || doc.templates || [])) {
                if (b.version) {
                  ref = `${r.key}-v${b.version}`;
                  break;
                }
              }
            }
          }
          refs.push({
            key: r.key || r.repo,
            repo: r.repo,
            ref: ref || 'main',
          });
        }
      }
      channels[ch] = { refs };
    }
  }

  const rawSkills = Array.isArray(doc.skills) ? doc.skills : [];
  const skills = rawSkills.map((s) => {
    const sVer = s.version || resolveVersionForEntry(s, 'skills', repoRoot);
    const mcp = Array.isArray(s.mcp)
      ? s.mcp.map((m) => {
          const mVer = m.version || resolveVersionForEntry(m, 'mcp', repoRoot);
          return { ...m, ...(mVer && mVer !== '0.0.0' ? { version: mVer } : {}) };
        })
      : [];
    return {
      ...s,
      ...(sVer && sVer !== '0.0.0' ? { version: sVer } : {}),
      ...(mcp.length ? { mcp } : {}),
    };
  });

  const rawBlueprints = Array.isArray(doc.blueprints) ? doc.blueprints : Array.isArray(doc.templates) ? doc.templates : [];
  const blueprints = rawBlueprints.map((b) => {
    const bVer = b.version || resolveVersionForEntry(b, 'blueprints', repoRoot);
    return {
      ...b,
      ...(bVer && bVer !== '0.0.0' ? { version: bVer } : {}),
    };
  });

  const rawConsole = Array.isArray(doc.console_assets) ? doc.console_assets : [];
  const consoleAssets = rawConsole.map((c) => {
    const cVer = c.version || resolveVersionForEntry(c, 'console', repoRoot);
    return {
      ...c,
      ...(cVer && cVer !== '0.0.0' ? { version: cVer } : {}),
    };
  });

  return {
    version: doc.version,
    entrypoint: doc.entrypoint,
    skills,
    blueprints,
    consoleAssets,
    workflows: Array.isArray(doc.workflows) ? doc.workflows : [],
    channels,
  };
}

async function resolveEntryRef(entry, channelRefs, resolveRef, policy, defaultRef = 'main') {
  const key = entry.ref_key || entry.repo;
  let refInfo = channelRefs.find((r) => r.key === key);
  if (refInfo === undefined) {
    refInfo = { key, repo: entry.repo || 'cogNNitive/cogNNitive', ref: defaultRef };
  }
  const { repo, ref } = refInfo;
  if (repo !== entry.repo && entry.repo) {
    return { error: `ref_key '${key}' resolves to repo '${repo}', but '${entry.name}' declares repo '${entry.repo}'` };
  }
  const resolved = await resolveRef(repo, ref);
  if (resolved.error) return { error: resolved.error };
  if (policy && resolved.kind && resolved.kind !== policy.requiredRefKind) {
    return {
      error: `ref '${ref}' resolves as a ${resolved.kind}, but the ${policy.name} channel requires a ${policy.requiredRefKind}`,
    };
  }
  return { ref, commit: resolved.sha };
}

async function buildRenderModel(source, channel, resolveRef, repoRoot = process.cwd()) {
  const channelRefs = (source.channels && source.channels[channel] && source.channels[channel].refs) || [];
  const policy = CHANNELS[channel];
  const defaultRef = channel === 'preview' ? 'main' : 'main';

  const skills = [];
  for (const skill of source.skills) {
    const resolved = await resolveEntryRef(skill, channelRefs, resolveRef, policy, defaultRef);
    if (resolved.error) return { error: `${skill.name}: ${resolved.error}` };
    const version = resolveVersionForEntry(skill, 'skills', repoRoot);

    const mcp = [];
    for (const m of (skill.mcp || [])) {
      const mResolved = await resolveEntryRef(m, channelRefs, resolveRef, policy, defaultRef);
      if (mResolved.error) return { error: `${m.name}: ${mResolved.error}` };
      const mVersion = resolveVersionForEntry(m, 'mcp', repoRoot);
      mcp.push({
        ...m,
        version: mVersion,
        ref: mResolved.ref,
        commit: mResolved.commit,
        url: `https://raw.githubusercontent.com/${m.repo}/${mResolved.commit}/${m.path}`,
      });
    }

    skills.push({ ...skill, version, ref: resolved.ref, commit: resolved.commit, mcp });
  }

  const blueprints = [];
  for (const blueprint of source.blueprints) {
    const resolved = await resolveEntryRef(blueprint, channelRefs, resolveRef, policy, defaultRef);
    if (resolved.error) return { error: `${blueprint.name}: ${resolved.error}` };
    const version = resolveVersionForEntry(blueprint, 'blueprints', repoRoot);
    blueprints.push({ ...blueprint, version, ref: resolved.ref, commit: resolved.commit });
  }

  const consoleAssets = [];
  for (const asset of source.consoleAssets) {
    const resolved = await resolveEntryRef(asset, channelRefs, resolveRef, policy, defaultRef);
    if (resolved.error) return { error: `${asset.name}: ${resolved.error}` };
    const version = resolveVersionForEntry(asset, 'console', repoRoot);
    consoleAssets.push({
      file: asset.file,
      version,
      ref: resolved.ref,
      commit: resolved.commit,
      url: `https://raw.githubusercontent.com/${asset.repo}/${resolved.commit}/${asset.file}`,
    });
  }

  return {
    version: source.version || '2.0',
    entrypoint: source.entrypoint || 'domaiNN_NN.md',
    skills,
    blueprints,
    consoleAssets,
    workflows: source.workflows || [],
  };
}

// ---------------------------------------------------------------------------
// Deterministic emitter — fixed key order, fixed quoting.
// ---------------------------------------------------------------------------

function q(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderNoteLines(note, indent) {
  if (!note) return '';
  return note
    .split('\n')
    .map((line) => `${indent}# ${line}`)
    .join('\n') + '\n';
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
      if (m.version !== undefined) {
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

function renderFrontmatter(model, channel) {
  const titleSuffix = channel === 'preview' ? ' (preview)' : '';
  let out = '---\n';
  out += `title: "cogNNitive — Bootstrap manifest${titleSuffix}"\n`;
  out += 'description: "Canonical agent-bootstrap manifest served raw (Jekyll-safe) for https://cognnitive.com/use."\n';
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

async function renderManifest(source, channel, body, resolveRef, repoRoot = process.cwd()) {
  if (channel !== 'preview') {
    return { error: `Channel '${channel}' is not supported by generate-manifest; stable manifest is assembled by the release workflow` };
  }
  const model = await buildRenderModel(source, channel, resolveRef, repoRoot);
  if (model.error) return { error: model.error };
  const rendered = normalizeOutput(`${renderFrontmatter(model, channel)}\n${body}`);
  return rendered;
}

// ---------------------------------------------------------------------------
// Minimal line diff for --check output.
// ---------------------------------------------------------------------------

function unifiedDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const out = [];
  for (let i = 0; i < max; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) continue;
    if (oldLine !== undefined) out.push(`- ${oldLine}`);
    if (newLine !== undefined) out.push(`+ ${newLine}`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  let channel = null;
  let check = false;
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--channel') channel = argv[++i];
    else if (arg.startsWith('--channel=')) channel = arg.slice('--channel='.length);
    else if (arg === '--check') check = true;
    else if (arg === '--out') out = argv[++i];
    else if (arg.startsWith('--out=')) out = arg.slice('--out='.length);
  }
  return { channel, check, out };
}

async function run(argv, options = {}) {
  const {
    cwd = process.cwd(),
    resolveRef = defaultResolveRef,
    log = console.log,
    logError = console.error,
  } = options;

  const { channel, check, out } = parseArgs(argv);

  if (!channel || channel !== 'preview') {
    logError("FAIL: --channel preview is required (stable manifest is assembled by release workflow)");
    return 2;
  }

  const sourcePath = path.join(cwd, 'manifest', 'source.yaml');
  const bodyPath = path.join(cwd, 'manifest', 'body.md');
  const bannerPath = path.join(cwd, 'manifest', 'body.preview-banner.md');

  let source;
  try {
    source = parseSourceYaml(fs.readFileSync(sourcePath, 'utf-8'));
  } catch (err) {
    logError(`FAIL: could not read/parse ${sourcePath}: ${err.message}`);
    return 2;
  }

  let body;
  try {
    body = fs.readFileSync(bodyPath, 'utf-8');
  } catch (err) {
    logError(`FAIL: could not read ${bodyPath}: ${err.message}`);
    return 2;
  }
  if (channel === 'preview' && fs.existsSync(bannerPath)) {
    body = `${fs.readFileSync(bannerPath, 'utf-8').trim()}\n\n${body}`;
  }

  const rendered = await renderManifest(source, channel, body, resolveRef, cwd);
  if (typeof rendered !== 'string') {
    logError(`FAIL: ${rendered.error}`);
    return 2;
  }

  const outPath = out ? path.resolve(cwd, out) : path.join(cwd, 'docs', 'use', 'manifest-next.md');

  if (check) {
    if (!fs.existsSync(outPath)) {
      logError(`FAIL: --check: ${outPath} does not exist`);
      return 1;
    }
    const onDisk = fs.readFileSync(outPath, 'utf-8');
    if (onDisk === rendered) {
      log(`OK: ${outPath} is up to date`);
      return 0;
    }
    logError(`FAIL: --check: ${outPath} differs from the generated render`);
    logError(unifiedDiff(onDisk, rendered));
    return 1;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered, 'utf-8');
  log(`OK: wrote ${outPath}`);
  return 0;
}

async function main() {
  const exitCode = await run(process.argv.slice(2));
  process.exit(exitCode);
}

module.exports = {
  parseSourceYaml,
  resolveEntryRef,
  buildRenderModel,
  renderManifest,
  normalizeOutput,
  unifiedDiff,
  parseArgs,
  run,
};

if (require.main === module) {
  main();
}
