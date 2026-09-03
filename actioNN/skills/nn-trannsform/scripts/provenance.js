/**
 * provenance.js — cogNNitive provenance model generator.
 *
 * Builds and refreshes an iNNfo level-3 provenance model that registers the
 * Sources ingested (and, once the agent adds them, the Models, Artifacts and
 * Procedures produced) as first-class iNNfo elements with explicit lineage.
 *
 * The model conforms to the `cogNNitive` level-2 template:
 *   https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/cogNNitive/cogNNitive_V_0-1-0_NN.md
 *
 * Zero runtime dependencies (Node builtins only), mirroring scanner.js.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_URL =
  'https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/cogNNitive/cogNNitive_V_0-1-0_NN.md';
const INNFO_URL =
  'https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md';
const TEMPLATE_NAME = 'cogNNitive_V_0-1-0';

const DOC_NOTICE =
  '> [!NOTE]\n> This is an **iNNfo document** — a plain-text Markdown file. ' +
  'Open it with any text editor or view and edit it with ' +
  '[cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).';

function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseSourceFrontmatter(content) {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const block = fm[1];
  const get = (key) => {
    const m = block.match(new RegExp('^\\s*' + key + ':\\s*"?([^"\\n\\r]+)"?\\s*$', 'm'));
    return m ? m[1].trim() : null;
  };
  const file = get('source_file');
  if (!file) return null;
  return {
    file,
    hash: get('sha256'),
    size: get('size_bytes'),
    normalized_at: get('normalized_at'),
    normalized_by: get('normalized_by'),
  };
}

/**
 * Recursively collect *.md files under sources/nn/, preserving their
 * path relative to that directory (subfolders mirror sources/original/).
 * The top-level ingestion manifest (index.md) is excluded.
 */
function walkMarkdown(mdDir) {
  const results = [];
  const walk = (dir, rel) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const relPath = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(abs, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (relPath === 'index.md') continue;
        results.push(relPath);
      }
    }
  };
  walk(mdDir, '');
  return results.sort();
}

function collectSources(mdDir) {
  const sources = [];
  if (!fs.existsSync(mdDir)) return sources;

  const files = walkMarkdown(mdDir);

  for (const relFile of files) {
    const content = fs.readFileSync(path.join(mdDir, relFile), 'utf8');
    const fmData = parseSourceFrontmatter(content);
    if (!fmData) continue;

    const rawBase = path.basename(fmData.file);
    const ext = path.extname(rawBase).replace(/^\./, '').toLowerCase();
    const relFilePosix = relFile.replace(/\\/g, '/');

    sources.push({
      name: rawBase,
      raw_filename: fmData.file,
      raw_hash: fmData.hash,
      size: fmData.size,
      source_format: ext,
      normalized_at: fmData.normalized_at,
      normalized_by: fmData.normalized_by,
      normalized_content: `sources/nn/${relFilePosix}`,
      mdFile: relFile,
    });
  }
  return sources;
}

function materializeAssets(projectDir, sources) {
  const mdDir = path.join(projectDir, 'sources', 'nn');
  const seenHashes = new Set();
  for (const src of sources) {
    if (src.raw_hash) {
      if (seenHashes.has(src.raw_hash)) {
        continue;
      }
      seenHashes.add(src.raw_hash);
    }
    const slug = slugify(src.name);
    const destDir = path.join(projectDir, 'assets', slug);
    fs.mkdirSync(destDir, { recursive: true });
    const from = path.join(mdDir, src.mdFile);
    const to = path.join(destDir, path.basename(src.mdFile));
    if (fs.existsSync(from)) fs.copyFileSync(from, to);
  }
}

function renderSourcesSection(sources) {
  let out = '# NN Sources\n';
  if (sources.length === 0) {
    out += '\n<!-- No sources ingested yet. Place files in sources/original and run a scan. -->\n';
    return out;
  }
  for (const s of sources) {
    out += `\n## NN Sources: ${s.name}\n`;
    out += `raw_filename:: ${s.raw_filename}\n`;
    if (s.raw_hash) out += `raw_hash:: ${s.raw_hash}\n`;
    if (s.size) out += `size:: ${s.size}\n`;
    if (s.source_format) out += `source_format:: ${s.source_format}\n`;
    if (s.normalized_at) out += `normalized_at:: ${s.normalized_at}\n`;
    if (s.normalized_by) out += `normalized_by:: ${s.normalized_by}\n`;
    out += `normalized_content:: ${s.normalized_content}\n`;
  }
  return out;
}

function emptySection(concept, guidance) {
  return `# NN ${concept}\n\n<!-- ${guidance} -->\n`;
}

function splitTopLevelSections(body) {
  const lines = body.split('\n');
  const blocks = [];
  let current = null;
  const preamble = [];
  for (const line of lines) {
    if (/^# (?!#)/.test(line)) {
      if (current) blocks.push(current);
      current = { heading: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) blocks.push(current);
  return { preamble: preamble.join('\n'), blocks };
}

function buildFreshModel(title, sources) {
  const frontmatter =
    '---\n' +
    'specification_version: "V_0-1-0"\n' +
    `specification_url: "${INNFO_URL}"\n` +
    'level: 3\n' +
    'parent_spec:\n' +
    `  name: "${TEMPLATE_NAME}"\n` +
    `  url: "${TEMPLATE_URL}"\n` +
    'model_version: "V_0-1-0"\n' +
    `title: "${title} Provenance"\n` +
    '---\n';

  const index =
    '# NN index\n\n' +
    '* [[Sources]]\n' +
    '* [[Procedures]]\n' +
    '* [[Models]]\n' +
    '* [[Artifacts]]\n';

  const procedures = emptySection(
    'Procedures',
    'Add one element per transformation run: ## NN Procedures: <run name> with procedure_ref, agent, run_at.'
  );
  const models = emptySection(
    'Models',
    'Add one element per domain model produced: ## NN Models: <title> with model_ref, model_template, model_version, derived_from:: [<sources>], generated_by:: [<procedure>].'
  );
  const artifacts = emptySection(
    'Artifacts',
    'Add one element per generated deliverable: ## NN Artifacts: <name> with artifact_format (document|report|board|dataset), location, derived_from_inputs:: [<sources and/or models>], produced_by:: [<procedure>].'
  );

  return [
    frontmatter,
    DOC_NOTICE,
    index,
    renderSourcesSection(sources),
    procedures,
    models,
    artifacts,
  ].join('\n') + '\n';
}

function refreshExistingModel(existing, sources) {
  const fmMatch = existing.match(/^(---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?)/);
  const frontmatter = fmMatch ? fmMatch[1] : '';
  const body = fmMatch ? existing.slice(frontmatter.length) : existing;

  const { preamble, blocks } = splitTopLevelSections(body);
  const newSources = renderSourcesSection(sources).replace(/\n+$/, '') + '\n';

  let replaced = false;
  const rebuilt = blocks.map((b) => {
    if (/^# NN Sources\b/.test(b.heading)) {
      replaced = true;
      return newSources;
    }
    return (b.heading + '\n' + b.lines.join('\n')).replace(/\n+$/, '') + '\n';
  });

  if (!replaced) {
    const idx = rebuilt.findIndex((s) => /^# NN index\b/.test(s));
    if (idx >= 0) rebuilt.splice(idx + 1, 0, newSources);
    else rebuilt.unshift(newSources);
  }

  const notice = preamble.replace(/^\n+|\n+$/g, '');
  return frontmatter + '\n' + notice + '\n\n' + rebuilt.join('\n') + '\n';
}

const INDEX_SKIP_DIRS = new Set(['backups', 'archive', 'specs', '.spec-cache', 'node_modules', '.git']);

function listWorkspaceModels(projectDir) {
  const found = [];
  const walk = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (name.startsWith('.') || INDEX_SKIP_DIRS.has(name)) continue;
      if (entry.isDirectory()) {
        walk(path.join(dir, name), prefix + name + '/');
      } else if (entry.isFile() && name.endsWith('_NN.md')) {
        found.push(prefix + name);
      }
    }
  };
  walk(projectDir, './');
  return found.sort();
}

/**
 * Parse `* [label](target)` and `* [[target]]` link lines out of a workspace
 * index.md. Returns `{ type, label, target }` entries. Non-link prose is not
 * returned (the file is a generated `# NN index`, not free-form content).
 */
function parseIndexLinks(content) {
  const links = [];
  const re = /^\*\s*(?:\[([^\]]*)\]\(([^)]*)\)|\[\[([^\]]+)\]\])\s*$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[1] !== undefined) {
      links.push({ type: 'md', label: m[1], target: m[2] });
    } else {
      links.push({ type: 'wiki', label: null, target: m[3] });
    }
  }
  return links;
}

function normalizeIndexTarget(projectDir, target) {
  let t = String(target).trim();
  try {
    t = decodeURIComponent(t);
  } catch (err) {
    // keep the raw target when it contains malformed percent-escapes
  }
  t = t.replace(/\\/g, '/').replace(/^\.\//, '');
  return { key: t.toLowerCase(), resolved: path.resolve(projectDir, t) };
}

function deriveIndexLabel(relPath) {
  return path
    .basename(relPath)
    .replace(/_V_\d+-\d+-\d+_[A-Za-z0-9-]+_NN\.md$/, '')
    .replace(/_NN\.md$/, '')
    .replace(/_/g, ' ');
}

function indexHref(relPath) {
  return relPath.split('/').map((seg, i, arr) =>
    i === arr.length - 1 ? encodeURIComponent(seg) : seg
  ).join('/');
}

function compareVersions(v1, v2) {
  for (let i = 0; i < 3; i++) {
    const diff = v1[i] - v2[i];
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseVersionFromPath(relPath) {
  const m = relPath.match(/_V_(\d+)-(\d+)-(\d+)_/i);
  if (m) {
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  return [0, 0, 0];
}

function getVersionStrippedKey(target) {
  let t = String(target).trim();
  try {
    t = decodeURIComponent(t);
  } catch (e) {}
  t = t.replace(/\\/g, '/').toLowerCase();
  return t.replace(/_v_\d+-\d+-\d+_/, '_');
}

function writeWorkspaceIndex(projectDir) {
  const indexPath = path.join(projectDir, 'index.md');
  const existed = fs.existsSync(indexPath);

  const fresh = listWorkspaceModels(projectDir);

  let lines = [];
  if (existed) {
    try {
      lines = fs.readFileSync(indexPath, 'utf8').split(/\r?\n/);
    } catch (e) {}
  }

  const parsedLinks = [];
  const nonLinkLines = [];
  const linkRegex = /^\*\s*(?:\[([^\]]*)\]\(([^)]*)\)|\[\[([^\]]+)\]\])\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(linkRegex);
    if (!match) {
      nonLinkLines.push({ lineIndex: i, line });
      continue;
    }

    const label = match[1];
    const target = match[2] || match[3];
    const isWiki = match[3] !== undefined;

    if (!target.endsWith('.md')) {
      nonLinkLines.push({ lineIndex: i, line });
      continue;
    }

    const { key, resolved } = normalizeIndexTarget(projectDir, target);
    const strippedKey = getVersionStrippedKey(target);
    const version = parseVersionFromPath(target);
    const exists = fs.existsSync(resolved);

    parsedLinks.push({
      lineIndex: i,
      line,
      label,
      target,
      isWiki,
      key,
      strippedKey,
      version,
      resolved,
      exists,
    });
  }

  const freshMap = new Map();
  for (const m of fresh) {
    const { key, resolved } = normalizeIndexTarget(projectDir, m);
    const strippedKey = getVersionStrippedKey(m);
    const version = parseVersionFromPath(m);
    freshMap.set(key, { target: indexHref(m), strippedKey, version, resolved, isFresh: true });
  }

  const allCandidates = {};
  const droppedDangling = [];

  for (const pl of parsedLinks) {
    if (!pl.exists) {
      droppedDangling.push(pl.line);
      continue;
    }
    if (!allCandidates[pl.strippedKey]) allCandidates[pl.strippedKey] = [];
    allCandidates[pl.strippedKey].push({
      target: pl.target,
      version: pl.version,
      isFresh: false,
      existingLink: pl,
    });
  }

  for (const [key, fm] of freshMap.entries()) {
    if (!allCandidates[fm.strippedKey]) allCandidates[fm.strippedKey] = [];
    if (!allCandidates[fm.strippedKey].some((c) => c.target === fm.target)) {
      allCandidates[fm.strippedKey].push({
        target: fm.target,
        version: fm.version,
        isFresh: true,
      });
    }
  }

  const selectedLinks = [];
  let added = 0;
  let preserved = 0;

  for (const strippedKey in allCandidates) {
    const candidates = allCandidates[strippedKey];
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (compareVersions(candidates[i].version, best.version) > 0) {
        best = candidates[i];
      }
    }

    for (const c of candidates) {
      if (c !== best && c.existingLink) {
        droppedDangling.push(c.existingLink.line);
      }
    }

    if (best.existingLink) {
      selectedLinks.push({
        type: 'existing',
        lineIndex: best.existingLink.lineIndex,
        line: best.existingLink.line,
      });
      preserved++;
    } else {
      const label = deriveIndexLabel(best.target);
      selectedLinks.push({
        type: 'new',
        line: `* [${label}](${best.target})`,
      });
      added++;
    }
  }

  const finalLines = [];
  const maxOriginalLines = lines.length;
  const originalLineSlot = new Array(maxOriginalLines).fill(null);

  for (const nll of nonLinkLines) {
    originalLineSlot[nll.lineIndex] = nll.line;
  }

  for (const sl of selectedLinks) {
    if (sl.type === 'existing') {
      originalLineSlot[sl.lineIndex] = sl.line;
    }
  }

  for (let i = 0; i < maxOriginalLines; i++) {
    if (originalLineSlot[i] !== null) {
      finalLines.push(originalLineSlot[i]);
    }
  }

  let lastListItemIdx = -1;
  for (let i = 0; i < finalLines.length; i++) {
    if (finalLines[i].startsWith('*')) {
      lastListItemIdx = i;
    }
  }

  const newLinkLines = selectedLinks.filter((sl) => sl.type === 'new').map((sl) => sl.line);
  if (newLinkLines.length > 0) {
    if (lastListItemIdx !== -1) {
      finalLines.splice(lastListItemIdx + 1, 0, ...newLinkLines);
    } else {
      if (finalLines.length === 0) {
        finalLines.push('# NN index', '');
      }
      finalLines.push(...newLinkLines);
    }
  }

  let finalContent = finalLines.join('\n');
  if (!finalContent.endsWith('\n')) {
    finalContent += '\n';
  }
  fs.writeFileSync(indexPath, finalContent, 'utf8');

  if (existed) {
    console.log(
      `Workspace index.md regenerated using Markdown-links format (preserved ${preserved} existing entry(ies), dropped ${droppedDangling.length} dangling/duplicate, added ${added} new). ` +
        `Note that workspace index uses Markdown links, unlike the WikiLinks used internally in Level 3 models.`
    );
  } else {
    console.log('Workspace index.md created');
  }
}

/**
 * Build or refresh the cogNNitive provenance model for a project.
 */
function buildProvenanceModel(projectDir, options = {}) {
  const projectName = options.projectName || path.basename(projectDir);
  const mdDir = path.join(projectDir, 'sources', 'nn');
  const sources = collectSources(mdDir);

  materializeAssets(projectDir, sources);

  const files = fs.existsSync(projectDir) ? fs.readdirSync(projectDir) : [];
  const prefix = `${projectName}_V_`;
  const suffix = `_cogNNitive_NN.md`;

  let bestFile = null;
  let bestVersion = [-1, -1, -1];

  for (const f of files) {
    if (f.startsWith(prefix) && f.endsWith(suffix)) {
      const verStr = f.substring(prefix.length, f.length - suffix.length);
      const parts = verStr.split('-');
      if (parts.length === 3) {
        const ver = parts.map(Number);
        if (ver.every((n) => !isNaN(n))) {
          if (compareVersions(ver, bestVersion) > 0) {
            bestVersion = ver;
            bestFile = f;
          }
        }
      }
    }
  }

  let modelPath;
  let created;
  if (bestFile) {
    modelPath = path.join(projectDir, bestFile);
    created = false;
  } else {
    modelPath = path.join(projectDir, `${projectName}_V_0-1-0_cogNNitive_NN.md`);
    created = true;
  }

  const content = created
    ? buildFreshModel(projectName, sources)
    : refreshExistingModel(fs.readFileSync(modelPath, 'utf8'), sources);

  fs.writeFileSync(modelPath, content, 'utf8');
  writeWorkspaceIndex(projectDir);

  return { modelPath, sourceCount: sources.length, created };
}

module.exports = {
  buildProvenanceModel,
  collectSources,
  slugify,
  writeWorkspaceIndex,
  listWorkspaceModels,
};

if (require.main === module) {
  const minimist = (() => {
    try {
      return require('minimist');
    } catch {
      return null;
    }
  })();
  const args = minimist
    ? minimist(process.argv.slice(2))
    : { src: process.argv[3] };
  const projectDir = args.src || process.cwd();
  const result = buildProvenanceModel(projectDir, { projectName: args.name });
  console.log(
    `cogNNitive Provenance model ${result.created ? 'created' : 'refreshed'}: ${result.modelPath}`
  );
  console.log(`Sources registered: ${result.sourceCount}`);
}
