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

/**
 * Converts a filename or title into a URL/filesystem slug.
 * @param {string} name
 * @returns {string}
 */
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

/**
 * Parses flat frontmatter from normalized markdown source.
 * @param {string} content
 * @returns {{ file: string, hash: string | null, size: string | null, normalized_at: string | null, normalized_by: string | null } | null}
 */
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
 * Recursively collect *.md files under sources/nn/, preserving subfolder paths.
 * @param {string} mdDir
 * @returns {string[]}
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

/**
 * Collects normalized sources from sources/nn/.
 * @param {string} mdDir
 * @returns {Array<{ name: string, raw_filename: string, raw_hash: string | null, size: string | null, source_format: string, normalized_at: string | null, normalized_by: string | null, normalized_content: string, mdFile: string }>}
 */
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

  // Disambiguate duplicate source names by prepending parent directory
  const nameCounts = {};
  for (const s of sources) {
    nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
  }
  for (const s of sources) {
    if (nameCounts[s.name] > 1) {
      const parentDir = path.dirname(s.mdFile);
      if (parentDir && parentDir !== '.') {
        s.name = `${parentDir.replace(/\\/g, '/')} ${s.name}`;
      }
    }
  }

  return sources;
}

/**
 * Copies source markdown files to assets/<slug>/ dirs.
 * @param {string} projectDir
 * @param {Array<any>} sources
 * @returns {void}
 */
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

/**
 * Formats NN Sources markdown section.
 * @param {Array<any>} sources
 * @returns {string}
 */
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

/**
 * Renders an empty placeholder section with guidance comment.
 * @param {string} concept
 * @param {string} guidance
 * @returns {string}
 */
function emptySection(concept, guidance) {
  return `# NN ${concept}\n\n<!-- ${guidance} -->\n`;
}

/**
 * Splits document body into preamble and top-level # sections.
 * @param {string} body
 * @returns {{ preamble: string, blocks: Array<{ heading: string, lines: string[] }> }}
 */
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

/**
 * Generates initial level-3 provenance model markdown document.
 * @param {string} title
 * @param {Array<any>} sources
 * @returns {string}
 */
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

/**
 * Refreshes the NN Sources section of an existing model while preserving other sections.
 * @param {string} existing
 * @param {Array<any>} sources
 * @returns {string}
 */
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

/**
 * Resolves the latest versioned provenance model file in projectDir, or null.
 * @param {string} projectDir
 * @param {string} projectName
 * @param {(v1: number[], v2: number[]) => number} compareVersions
 * @returns {string | null}
 */
function resolveLatestModelFile(projectDir, projectName, compareVersions) {
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

  return bestFile;
}

module.exports = {
  TEMPLATE_URL,
  INNFO_URL,
  TEMPLATE_NAME,
  DOC_NOTICE,
  slugify,
  parseSourceFrontmatter,
  walkMarkdown,
  collectSources,
  materializeAssets,
  renderSourcesSection,
  emptySection,
  splitTopLevelSections,
  buildFreshModel,
  refreshExistingModel,
  resolveLatestModelFile,
};
