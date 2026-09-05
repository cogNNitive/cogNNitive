const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const converters = require('./scanner-converters');

const TRANNNSFORM_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../..', 'package.json'), 'utf8')).version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

// Supported extensions by category
const EXT_OK = ['.txt', '.md', '.csv', '.json', '.html', '.htm', '.srt', '.vtt'];
const EXT_PROMPT = ['.docx', '.pdf', '.xlsx', '.xls', '.doc'];
const EXT_NO = ['.mp3', '.wav', '.png', '.jpg', '.jpeg', '.gif'];

const EXT_LABELS = {
  '.txt': 'txt', '.md': 'md', '.csv': 'csv', '.json': 'json', '.html': 'html', '.htm': 'htm',
  '.srt': 'srt', '.vtt': 'vtt',
  '.docx': 'docx', '.pdf': 'pdf', '.xlsx': 'xlsx', '.xls': 'xls', '.doc': 'doc'
};

const EXT_DEPS = {
  '.docx': { pkg: 'mammoth', label: 'mammoth' },
  '.pdf':  { pkg: 'pdf-parse', label: 'pdf-parse' },
  '.xlsx': { pkg: 'xlsx', label: 'xlsx' },
  '.xls':  { pkg: 'xlsx', label: 'xlsx' }
};

/**
 * Compute SHA-256 hash of a file.
 * @param {string} filePath
 * @returns {string}
 */
function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Escapes characters for YAML double-quoted string values.
 * @param {any} value
 * @returns {string}
 */
function escapeYamlString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');
}

/**
 * Generate canonical flat YAML frontmatter for a normalized source file.
 * Supports W3C PROV-O, RO-Crate and bibliographic metadata (Phase 2 & 3).
 * @param {string} originalFilePath
 * @param {string} relativeSourcePath
 * @param {Record<string, any>} [extra]
 * @returns {string}
 */
function generateSourceFrontmatter(originalFilePath, relativeSourcePath, extra = {}) {
  const hash = computeFileHash(originalFilePath);
  const timestamp = new Date().toISOString();
  const stat = fs.statSync(originalFilePath);

  const lines = [
    '---',
    `source_file: "${relativeSourcePath}"`,
    `sha256: "${hash}"`,
    `size_bytes: ${stat.size}`,
    `normalized_at: "${timestamp}"`,
    `normalized_by: "traNNsform v${TRANNNSFORM_VERSION}"`,
  ];

  if (extra.staging_file) lines.push(`staging_file: "${escapeYamlString(extra.staging_file)}"`);
  if (extra.is_synthetic !== undefined) lines.push(`is_synthetic: ${Boolean(extra.is_synthetic)}`);

  if (extra.source_url) lines.push(`source_url: "${escapeYamlString(extra.source_url)}"`);
  if (extra.downloaded_at) lines.push(`downloaded_at: "${escapeYamlString(extra.downloaded_at)}"`);
  if (extra.title) lines.push(`title: "${escapeYamlString(extra.title)}"`);
  if (extra.description) lines.push(`description: "${escapeYamlString(extra.description)}"`);
  if (extra.author) lines.push(`author: "${escapeYamlString(extra.author)}"`);

  if (extra.canonical && typeof extra.canonical === 'object') {
    lines.push('canonical:');
    if (extra.canonical.title) lines.push(`  title: "${escapeYamlString(extra.canonical.title)}"`);
    if (extra.canonical.author) lines.push(`  author: "${escapeYamlString(extra.canonical.author)}"`);
    if (extra.canonical.year) lines.push(`  year: ${extra.canonical.year}`);
    if (extra.canonical.doi) lines.push(`  doi: "${escapeYamlString(extra.canonical.doi)}"`);
    if (extra.canonical.bibtex) {
      lines.push('  bibtex: |');
      const bibLines = extra.canonical.bibtex.trim().split(/\r?\n/);
      for (const bl of bibLines) {
        lines.push(`    ${bl}`);
      }
    }
  }

  if (Array.isArray(extra.references) && extra.references.length > 0) {
    lines.push('references:');
    for (const ref of extra.references) {
      lines.push(`  - id: "${escapeYamlString(ref.id || '')}"`);
      if (ref.citation) lines.push(`    citation: "${escapeYamlString(ref.citation)}"`);
      if (ref.doi) lines.push(`    doi: "${escapeYamlString(ref.doi)}"`);
      if (ref.is_primary !== undefined) lines.push(`    is_primary: ${Boolean(ref.is_primary)}`);
    }
  }

  lines.push('---', '', '');
  return lines.join('\n');
}

/**
 * Read the sha256 field back out of an already-normalized markdown file's frontmatter.
 * @param {string} destPath
 * @returns {string | null}
 */
function readExistingSha256(destPath) {
  if (!fs.existsSync(destPath)) return null;
  try {
    const content = fs.readFileSync(destPath, 'utf8');
    const m = content.match(/^sha256:\s*"([a-f0-9]{64})"\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Recursively walk directory preserving subfolders (ignoring staging and hidden files).
 * @param {string} originalDir
 * @returns {Array<{ absPath: string, relPath: string }>}
 */
function walkOriginal(originalDir) {
  const results = [];
  const walk = (dir, relDir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name.startsWith('.') ||
        entry.name.startsWith('~$') ||
        entry.name.toLowerCase() === 'desktop.ini' ||
        entry.name.toLowerCase() === 'staging'
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const relPath = relDir ? path.join(relDir, entry.name) : entry.name;

      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        results.push({ absPath: fullPath, relPath });
      }
    }
  };

  if (fs.existsSync(originalDir)) walk(originalDir, '');
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * Detect available formats in a directory (recursive, ignoring staging).
 * @param {string} dir
 * @returns {Record<string, number>}
 */
function detectFormats(dir) {
  /** @type {Record<string, number>} */
  const counts = {};
  if (!fs.existsSync(dir)) return counts;

  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name.startsWith('.') ||
        entry.name.startsWith('~$') ||
        entry.name.toLowerCase() === 'desktop.ini' ||
        entry.name.toLowerCase() === 'staging'
      ) {
        continue;
      }
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext in EXT_LABELS) counts[ext] = (counts[ext] || 0) + 1;
      }
    }
  };

  walk(dir);
  return counts;
}

/**
 * Returns comma-separated list of supported extensions.
 * @returns {string}
 */
function getSupportedFormats() {
  return Object.values(EXT_LABELS).map(l => `\`${l}\``).join(', ');
}

/**
 * Parses frontmatter key-value pairs from markdown text.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseFrontmatterFields(content) {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return {};
  const block = fm[1];
  /** @type {Record<string, string>} */
  const fields = {};
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    let val = line.substring(colonIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    fields[key] = val;
  }
  return fields;
}

/**
 * Retrieves existing frontmatter fields from normalized destination file if present.
 * @param {string} destPath
 * @param {string} sourceFileField
 * @returns {Record<string, string>}
 */
function getExistingFrontmatterFields(destPath, sourceFileField) {
  if (!fs.existsSync(destPath)) return {};
  try {
    const content = fs.readFileSync(destPath, 'utf8');
    const fields = parseFrontmatterFields(content);
    if (!fields.source_file || fields.source_file === sourceFileField) {
      return fields;
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

/**
 * Processes native/text formats and writes normalized markdown files.
 * @param {string} ext
 * @param {string} absPath
 * @param {string} sourceFileField
 * @param {string} destPath
 * @param {string} displayOutPath
 * @param {boolean} isSelected
 * @param {Record<string, any>} extra
 * @returns {{ format: string, status: string, action: string, outcome: 'processed' | 'skipped' }}
 */
function processOkFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, extra) {
  const format = ext === '.txt' ? 'Plain Text' : ext.substring(1).toUpperCase();
  if (!isSelected) {
    return { format, status: '⚠️ Skipped', action: `Format ${EXT_LABELS[ext]} excluded by user selection.`, outcome: 'skipped' };
  }

  const newHash = computeFileHash(absPath);
  const existingHash = readExistingSha256(destPath);
  if (existingHash && existingHash === newHash) {
    return { format, status: '✅ Processed', action: `Already up to date at \`sources/nn/${displayOutPath}\` (unchanged, sha256 match).`, outcome: 'processed' };
  }

  try {
    const baseName = path.basename(displayOutPath, '.md');
    const body = converters.convertOkFormat(ext, absPath, baseName);

    const existingFields = getExistingFrontmatterFields(destPath, sourceFileField);
    const finalExtra = {
      source_url: extra.source_url || existingFields.source_url,
      downloaded_at: extra.downloaded_at || existingFields.downloaded_at,
      title: extra.title || existingFields.title,
      description: extra.description || existingFields.description,
      author: extra.author || existingFields.author
    };

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, generateSourceFrontmatter(absPath, sourceFileField, finalExtra) + body, 'utf8');
    return { format, status: '✅ Processed', action: `Converted to markdown at \`sources/nn/${displayOutPath}\``, outcome: 'processed' };
  } catch (err) {
    return { format, status: '❌ Error', action: `Failed to process: ${err.message}`, outcome: 'skipped' };
  }
}

/**
 * Handles binary document formats prompting for conversion consent and dependency checks.
 * @param {string} ext
 * @param {string} absPath
 * @param {string} sourceFileField
 * @param {string} destPath
 * @param {string} displayOutPath
 * @param {boolean} isSelected
 * @param {Record<string, any>} options
 * @param {Record<string, any>} extra
 * @returns {Promise<{ format: string, status: string, action: string, outcome: 'processed' | 'skipped' }>}
 */
async function processPromptFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, options, extra) {
  const format = ext.substring(1).toUpperCase();
  if (!isSelected) {
    return { format, status: '⚠️ Skipped', action: `Format ${EXT_LABELS[ext]} excluded by user selection.`, outcome: 'skipped' };
  }

  if (ext === '.doc') {
    return { format, status: '⚠️ Skipped', action: '.doc no soportado — convertirlo a .docx o usar el .txt', outcome: 'skipped' };
  }

  const dep = await converters.ensureDependency(ext, options, EXT_DEPS);
  if (!dep.ok) {
    return { format, status: dep.status, action: dep.reason, outcome: 'skipped' };
  }

  const newHash = computeFileHash(absPath);
  const existingHash = readExistingSha256(destPath);
  if (existingHash && existingHash === newHash) {
    return { format, status: '✅ Processed', action: `Already up to date at \`sources/nn/${displayOutPath}\` (unchanged, sha256 match).`, outcome: 'processed' };
  }

  let approve = options.autoAcceptPrompt;
  if (!approve && options.promptCallback) {
    approve = await options.promptCallback(sourceFileField);
  }
  if (!approve) {
    return { format, status: '⚠️ Skipped', action: 'Extraction declined or skipped.', outcome: 'skipped' };
  }

  try {
    const baseName = path.basename(displayOutPath, '.md');
    const result = await converters.PROMPT_CONVERTERS[ext](absPath, baseName);

    const mergedExtra = { ...extra };
    if (ext === '.pdf' && result.info) {
      if (result.info.Title && !mergedExtra.title) mergedExtra.title = result.info.Title;
      if (result.info.Author && !mergedExtra.author) mergedExtra.author = result.info.Author;
    }

    const existingFields = getExistingFrontmatterFields(destPath, sourceFileField);
    const finalExtra = {
      source_url: mergedExtra.source_url || existingFields.source_url,
      downloaded_at: mergedExtra.downloaded_at || existingFields.downloaded_at,
      title: mergedExtra.title || existingFields.title,
      description: mergedExtra.description || existingFields.description,
      author: mergedExtra.author || existingFields.author
    };

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, generateSourceFrontmatter(absPath, sourceFileField, finalExtra) + result.body, 'utf8');
    if (result.partial) {
      return { format, status: '✅ Processed (Partial)', action: `Created placeholder markdown at \`sources/nn/${displayOutPath}\`. PDF parsing failed: ${result.note}`, outcome: 'processed' };
    }
    return { format, status: '✅ Processed', action: `Converted ${format} to markdown at \`sources/nn/${displayOutPath}\``, outcome: 'processed' };
  } catch (err) {
    return { format, status: '❌ Error', action: `Failed to convert: ${err.message}`, outcome: 'skipped' };
  }
}

module.exports = {
  TRANNNSFORM_VERSION,
  EXT_OK,
  EXT_PROMPT,
  EXT_NO,
  EXT_LABELS,
  EXT_DEPS,
  computeFileHash,
  escapeYamlString,
  generateSourceFrontmatter,
  readExistingSha256,
  walkOriginal,
  detectFormats,
  getSupportedFormats,
  parseFrontmatterFields,
  getExistingFrontmatterFields,
  processOkFile,
  processPromptFile,
};
