const fs = require('fs');
const path = require('path');
const core = require('./lib/scanner-core');
const converters = require('./lib/scanner-converters');

/**
 * Scan sources/original/ (recursively, subfolders preserved) and normalize
 * straight into sources/nn/, mirroring the same relative paths.
 * @param {string} projectDir
 * @param {Record<string, any>} [options]
 * @returns {Promise<{ totalDiscovered: number, processedCount: number, skippedCount: number, registry: Array<any> }>}
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

  const files = core.walkOriginal(originalDir);
  logs.push(`*   **${timestamp}:** Discovered ${files.length} file(s) in \`sources/original/\` (subfolders preserved).`);

  const webImportMeta = options.webImportMeta || {};

  const registry = [];
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
    if (core.EXT_OK.includes(ext)) {
      entry = core.processOkFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, extra);
    } else if (core.EXT_PROMPT.includes(ext)) {
      entry = await core.processPromptFile(ext, absPath, sourceFileField, destPath, displayOutPath, isSelected, options, extra);
    } else if (core.EXT_NO.includes(ext)) {
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
  detectFormats: core.detectFormats,
  isDepInstalled: converters.isDepInstalled,
  getSupportedFormats: core.getSupportedFormats,
  computeFileHash: core.computeFileHash,
  generateSourceFrontmatter: core.generateSourceFrontmatter,
  walkOriginal: core.walkOriginal,
  convertPdf: converters.convertPdf,
  convertDocx: converters.convertDocx,
  convertXlsx: converters.convertXlsx,
  convertOkFormat: converters.convertOkFormat,
  stripFrontmatter: converters.stripFrontmatter,
  htmlToPlainText: converters.htmlToPlainText,
  EXT_LABELS: core.EXT_LABELS,
  EXT_DEPS: core.EXT_DEPS,
};
