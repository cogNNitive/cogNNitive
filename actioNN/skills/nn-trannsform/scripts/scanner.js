const fs = require('fs');
const path = require('path');
const core = require('./lib/scanner-core');
const converters = require('./lib/scanner-converters');

/**
 * Scan active source trees (sources/import/, sources/conversations/, sources/export/,
 * with legacy fallback to sources/original/) and normalize straight into sources/nn/,
 * mirroring the source subtree structure.
 * @param {string} projectDir
 * @param {Record<string, any>} [options]
 * @returns {Promise<{ totalDiscovered: number, processedCount: number, skippedCount: number, registry: Array<any> }>}
 */
async function scanAndProcess(projectDir, options = {}) {
  const sourcesDir = path.join(projectDir, 'sources');
  const importDir = path.join(sourcesDir, 'import');
  const originalDir = path.join(sourcesDir, 'original');
  const nnDir = path.join(sourcesDir, 'nn');
  const indexFile = path.join(nnDir, 'index.md');

  if (!fs.existsSync(importDir) && !fs.existsSync(originalDir)) {
    fs.mkdirSync(importDir, { recursive: true });
  }
  fs.mkdirSync(nnDir, { recursive: true });

  const logs = [];
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  logs.push(`*   **${timestamp}:** Scan initiated across active source trees in \`${sourcesDir}\`.`);

  const files = core.walkSourceTrees(projectDir);
  logs.push(`*   **${timestamp}:** Discovered ${files.length} file(s) across active source trees.`);

  const webImportMeta = options.webImportMeta || {};

  const registry = [];
  let totalDiscovered = 0;
  let processedCount = 0;
  let skippedCount = 0;

  for (const item of files) {
    const { absPath, relPath, sourceFileField, destRelPath, isSynthetic, tree } = item;
    const stat = fs.statSync(absPath);
    const ext = path.extname(relPath).toLowerCase();
    const destPath = path.join(nnDir, destRelPath);
    const displayOutPath = destRelPath.replace(/\\/g, '/');

    const relPathPosix = relPath.replace(/\\/g, '/');
    const isSelected = !options.formats || options.formats.includes(ext);
    const extra = { ...(webImportMeta[sourceFileField] || webImportMeta[relPathPosix] || {}) };
    extra.is_synthetic = isSynthetic;

    if (tree === 'conversations') {
      const baseName = path.basename(relPath, ext);
      if (baseName.endsWith('_source')) {
        extra.conversation_format = 'full';
        extra.source_type = 'conversation_transcript';
      } else if (baseName.endsWith('_summary')) {
        extra.conversation_format = 'summary';
        extra.source_type = 'conversation_summary';
      }
    }

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

  logs.push(`*   **${timestamp}:** Converted ${processedCount} file(s) to Markdown in \`sources/nn/\`, mirroring active source subtrees.`);

  // Build sources/nn/index.md manifest with OKF v0.1 compliant frontmatter
  let indexContent = `---\ntype: "index"\ntitle: "traNNsform Ingestion Manifest & Processing Log"\ndescription: "Source documents registry and processing log for normalized knowledge assets"\ntags: [sources, ingestion, manifest, okf, provenance]\ntimestamp: "${new Date().toISOString()}"\n---\n\n`;
  indexContent += `# traNNsform Ingestion Manifest & Processing Log\n\n`;
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
  walkSourceTrees: core.walkSourceTrees,
  convertPdf: converters.convertPdf,
  convertDocx: converters.convertDocx,
  convertXlsx: converters.convertXlsx,
  convertOkFormat: converters.convertOkFormat,
  stripFrontmatter: converters.stripFrontmatter,
  htmlToPlainText: converters.htmlToPlainText,
  EXT_LABELS: core.EXT_LABELS,
  EXT_DEPS: core.EXT_DEPS,
};
