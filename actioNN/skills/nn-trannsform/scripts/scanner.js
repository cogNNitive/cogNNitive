const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const TRANNNSFORM_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

// Supported extensions by category
const EXT_OK = ['.txt', '.md', '.csv', '.json', '.html', '.htm'];
const EXT_PROMPT = ['.docx', '.pdf', '.xlsx', '.xls', '.doc'];
const EXT_NO = ['.mp3', '.wav', '.png', '.jpg', '.jpeg', '.gif'];

const EXT_LABELS = {
  '.txt': 'txt', '.md': 'md', '.csv': 'csv', '.json': 'json', '.html': 'html', '.htm': 'htm',
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
 * Generate the canonical flat YAML frontmatter for a normalized source file.
 *
 * Schema (must match the iNNfo editor exactly — flat, no nesting):
 *   source_file, sha256, size_bytes, normalized_at, normalized_by
 * Optional (web-imported sources only): source_url, downloaded_at, title, description, author.
 * @param {string} originalFilePath
 * @param {string} relativeSourcePath
 * @param {SourceFrontmatterExtra} [extra]
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

  if (extra.source_url) lines.push(`source_url: "${escapeYamlString(extra.source_url)}"`);
  if (extra.downloaded_at) lines.push(`downloaded_at: "${escapeYamlString(extra.downloaded_at)}"`);
  if (extra.title) lines.push(`title: "${escapeYamlString(extra.title)}"`);
  if (extra.description) lines.push(`description: "${escapeYamlString(extra.description)}"`);
  if (extra.author) lines.push(`author: "${escapeYamlString(extra.author)}"`);

  lines.push('---', '', '');
  return lines.join('\n');
}

/**
 * Read the sha256 field back out of an already-normalized markdown file's frontmatter.
 * Used to decide whether an expensive re-conversion can be skipped.
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
 * Recursively walk sources/original (or any directory), returning files with
 * their path relative to the root — subfolders are preserved, never flattened.
 * @param {string} originalDir
 * @returns {ScannerWalkFile[]}
 */
function walkOriginal(originalDir) {
  /** @type {ScannerWalkFile[]} */
  const results = [];
  const walk = (dir, relDir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('~$') || entry.name.toLowerCase() === 'desktop.ini') {
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
 * Detect available formats in a directory (recursive).
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
      if (entry.name.startsWith('.') || entry.name.startsWith('~$') || entry.name.toLowerCase() === 'desktop.ini') {
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
 * Checks if an optional npm dependency is resolvable.
 * @param {string} pkgName
 * @returns {boolean}
 */
function isDepInstalled(pkgName) {
  try {
    require.resolve(pkgName, { paths: [__dirname] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns comma-separated list of supported extensions.
 * @returns {string}
 */
function getSupportedFormats() {
  return Object.values(EXT_LABELS).map(l => `\`${l}\``).join(', ');
}

/**
 * Strips leading frontmatter delimited by ---.
 * @param {string} content
 * @returns {string}
 */
function stripFrontmatter(content) {
  if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) return content.slice(endIdx + 5);
  }
  return content;
}

/**
 * Zero-dependency HTML-to-plain-text conversion (simple string/regex based —
 * no cheerio/jsdom). Good enough for normalizing downloaded web pages.
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts recognized plain text / structured formats directly to markdown content.
 * @param {string} ext
 * @param {string} filePath
 * @param {string} baseName
 * @returns {string}
 */
function convertOkFormat(ext, filePath, baseName) {
  const content = fs.readFileSync(filePath, 'utf8');
  switch (ext) {
    case '.md':
      return stripFrontmatter(content);
    case '.json':
      return `# ${baseName}\n\n\`\`\`json\n${content}\n\`\`\``;
    case '.csv':
      return `# ${baseName}\n\n\`\`\`csv\n${content}\n\`\`\``;
    case '.html':
    case '.htm':
      return `# ${baseName}\n\n${htmlToPlainText(content)}`;
    case '.txt':
    default:
      return content;
  }
}

/**
 * Converts DOCX file to markdown using mammoth.
 * @param {string} filePath
 * @returns {Promise<ScannerConversionResult>}
 */
async function convertDocx(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.convertToMarkdown({ path: filePath });
  return { body: result.value };
}

/**
 * Converts PDF file to markdown using pdf-parse with fallback placeholder.
 * @param {string} filePath
 * @param {string} baseName
 * @returns {Promise<ScannerConversionResult>}
 */
async function convertPdf(filePath, baseName) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fs.readFileSync(filePath));
    return { body: `# ${baseName}\n\n${data.text}`, info: data.info };
  } catch (pdfErr) {
    return {
      body: `# ${baseName}\n\n*PDF Content Ingested (Placeholder)*\n\n[PDF: ${path.basename(filePath)} needs manual verification or a PDF parser package to extract text fully.]`,
      partial: true,
      note: pdfErr.message,
    };
  }
}

/**
 * Converts spreadsheet workbook sheets into markdown tables using xlsx.
 * @param {string} filePath
 * @param {string} baseName
 * @returns {ScannerConversionResult}
 */
function convertXlsx(filePath, baseName) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  let body = `# ${baseName}\n\n`;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    body += `## Sheet: ${sheetName}\n\n`;
    if (json.length > 0) {
      const headers = Object.keys(json[0]);
      body += `| ${headers.join(' | ')} |\n`;
      body += `| ${headers.map(() => '---').join(' | ')} |\n`;
      for (const row of json) {
        body += `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |\n`;
      }
    } else {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cells = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          cells.push(String(sheet[addr]?.v ?? ''));
        }
        body += `| ${cells.join(' | ')} |\n`;
      }
    }
    body += '\n';
  }
  return { body };
}

const PROMPT_CONVERTERS = {
  '.docx': convertDocx,
  '.pdf': convertPdf,
  '.xlsx': convertXlsx,
  '.xls': convertXlsx,
};

/**
 * Checks and installs optional package dependencies required for prompt formats.
 * @param {string} ext
 * @param {ScanOptions} options
 * @returns {Promise<DependencyCheckResult>}
 */
async function ensureDependency(ext, options) {
  const dep = EXT_DEPS[ext];
  if (!dep || isDepInstalled(dep.pkg)) return { ok: true };

  let install = false;
  if (options.depPromptCallback) {
    install = await options.depPromptCallback(ext);
  } else if (options.autoAcceptPrompt) {
    install = true;
  }

  if (!install) {
    return { ok: false, status: '⚠️ Skipped', reason: `Dependency ${dep.pkg} not installed. Skipped.` };
  }

  try {
    const skillDir = path.resolve(__dirname, '..');
    console.log(`Installing ${dep.pkg}...`);
    execSync(`npm install ${dep.pkg}`, { cwd: skillDir, stdio: 'inherit' });
    console.log(`${dep.pkg} installed.`);
    return { ok: true };
  } catch (err) {
    return { ok: false, status: '❌ Error', reason: `Failed to install ${dep.pkg}: ${err.message}` };
  }
}

/**
 * Parses frontmatter key-value pairs from markdown text.
 * @param {string} content
 * @returns {SourceFrontmatterFields}
 */
function parseFrontmatterFields(content) {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return {};
  const block = fm[1];
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
 * @returns {SourceFrontmatterFields}
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
 * @param {SourceFrontmatterExtra} extra
 * @returns {ScannerProcessResult}
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
    const body = convertOkFormat(ext, absPath, baseName);

    // Merge existing optional fields
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
 * @param {ScanOptions} options
 * @param {SourceFrontmatterExtra} extra
 * @returns {Promise<ScannerProcessResult>}
 */
async function processPromptFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, options, extra) {
  const format = ext.substring(1).toUpperCase();
  if (!isSelected) {
    return { format, status: '⚠️ Skipped', action: `Format ${EXT_LABELS[ext]} excluded by user selection.`, outcome: 'skipped' };
  }

  // Handle .doc format separately as it's legacy and not supported, skipping conversions
  if (ext === '.doc') {
    return { format, status: '⚠️ Skipped', action: '.doc no soportado — convertirlo a .docx o usar el .txt', outcome: 'skipped' };
  }

  const dep = await ensureDependency(ext, options);
  if (!dep.ok) {
    return { format, status: dep.status, action: dep.reason, outcome: 'skipped' };
  }

  // Performance optimization preserved from the previous implementation, but now
  // based on comparing sha256 of the source against the sha256 already recorded
  // in the normalized file's frontmatter — not on raw/ artifacts or mere existence.
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
    const result = await PROMPT_CONVERTERS[ext](absPath, baseName);

    // Best-effort PDF metadata (title/author) from pdf-parse's own `info` object —
    // no separate PDF metadata extractor, no new dependency.
    const mergedExtra = { ...extra };
    if (ext === '.pdf' && result.info) {
      if (result.info.Title && !mergedExtra.title) mergedExtra.title = result.info.Title;
      if (result.info.Author && !mergedExtra.author) mergedExtra.author = result.info.Author;
    }

    // Merge existing optional fields
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

/**
 * Scan sources/original/ (recursively, subfolders preserved) and normalize
 * straight into sources/nn/, mirroring the same relative paths.
 * @param {string} projectDir
 * @param {ScanOptions} [options]
 * @returns {Promise<ScanSummary>}
 */
async function scanAndProcess(projectDir, options = {}) {
  const originalDir = path.join(projectDir, 'sources', 'original');
  const nnDir = path.join(projectDir, 'sources', 'nn');
  const indexFile = path.join(nnDir, 'index.md');

  fs.mkdirSync(originalDir, { recursive: true });
  fs.mkdirSync(nnDir, { recursive: true });

  const logs = [];
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  logs.push(`*   **${timestamp}:** Scan initiated in \`${originalDir}\`.`);

  const files = walkOriginal(originalDir);
  logs.push(`*   **${timestamp}:** Discovered ${files.length} file(s) in \`sources/original/\` (subfolders preserved).`);

  const webImportMeta = options.webImportMeta || {};

  let registry = [];
  let totalDiscovered = 0;
  let processedCount = 0;
  let skippedCount = 0;

  for (const { absPath, relPath } of files) {
    const stat = fs.statSync(absPath);
    const ext = path.extname(relPath).toLowerCase();
    const relDir = path.dirname(relPath);
    const baseName = path.basename(relPath, ext);
    const outRelDir = relDir === '.' ? '' : relDir;
    const displayOutPath = (outRelDir ? path.join(outRelDir, `${baseName}.md`) : `${baseName}.md`).replace(/\\/g, '/');
    const destPath = path.join(nnDir, displayOutPath);

    const relPathPosix = relPath.replace(/\\/g, '/');
    const sourceFileField = `sources/original/${relPathPosix}`;
    const isSelected = !options.formats || options.formats.includes(ext);
    const extra = webImportMeta[relPathPosix] || {};

    let entry;
    if (EXT_OK.includes(ext)) {
      entry = processOkFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, extra);
    } else if (EXT_PROMPT.includes(ext)) {
      entry = await processPromptFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, options, extra);
    } else if (EXT_NO.includes(ext)) {
      entry = { format: ext.substring(1).toUpperCase(), status: '🚫 Blocked', action: 'Unsupported format (needs manual action)', outcome: 'skipped' };
    } else {
      entry = { format: 'Unknown', status: '⚠️ Skipped', action: 'Unknown extension', outcome: 'skipped' };
    }

    totalDiscovered++;
    if (entry.outcome === 'processed') {
      processedCount++;
    } else {
      skippedCount++;
    }

    registry.push({
      name: sourceFileField,
      format: entry.format,
      size: stat.size,
      status: entry.status,
      action: entry.action,
    });
  }

  logs.push(`*   **${timestamp}:** Converted ${processedCount} file(s) to Markdown in \`sources/nn/\`, mirroring \`sources/original/\` subfolders.`);

  // Build sources/nn/index.md manifest
  let indexContent = `# traNNsform Ingestion Manifest & Processing Log\n\n`;
  indexContent += `## Ingestion Status\n`;
  indexContent += `*   **Total Files Discovered:** ${totalDiscovered}\n`;
  indexContent += `*   **Processed successfully:** ${processedCount}\n`;
  indexContent += `*   **Skipped/Pending review:** ${skippedCount}\n\n`;

  indexContent += `## Documents Registry\n`;
  indexContent += `| File Name | Format | Size (bytes) | Status | Actions Taken |\n`;
  indexContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const reg of registry) {
    indexContent += `| \`${reg.name}\` | ${reg.format} | ${reg.size} B | ${reg.status} | ${reg.action} |\n`;
  }
  indexContent += `\n---\n\n## Action History Log\n`;
  for (const log of logs) {
    indexContent += `${log}\n`;
  }

  fs.writeFileSync(indexFile, indexContent, 'utf8');

  return {
    totalDiscovered,
    processedCount,
    skippedCount,
    registry
  };
}

module.exports = {
  scanAndProcess,
  detectFormats,
  isDepInstalled,
  getSupportedFormats,
  computeFileHash,
  generateSourceFrontmatter,
  walkOriginal,
  convertPdf,
  convertDocx,
  convertXlsx,
  convertOkFormat,
  stripFrontmatter,
  htmlToPlainText,
  EXT_LABELS,
  EXT_DEPS
};
