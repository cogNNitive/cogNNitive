const fs = require('fs');
const path = require('path');
const modelLib = require('./provenance-model');
const { extractHeadingSlugs } = require('../markdown-utils');

/**
 * Audit all models in the workspace to verify that every `sources::` citation
 * resolves to an existing normalized source file AND an existing heading slug.
 *
 * @param {string} projectDir
 * @returns {{
 *   errors: string[],
 *   warnings: string[],
 *   totalCitations: number,
 *   validCitations: number,
 *   driftedCitations: Array<{
 *     modelFile: string,
 *     elementName?: string,
 *     citation: string,
 *     sourceFile: string,
 *     headingSlug: string,
 *     reason: string,
 *     suggestions?: string[]
 *   }>
 * }}
 */
function auditModelCitations(projectDir) {
  const errors = [];
  const warnings = [];
  const driftedCitations = [];
  let totalCitations = 0;
  let validCitations = 0;

  const nnDir = path.join(projectDir, 'sources', 'nn');
  const modelsDir = path.join(projectDir, 'models');

  if (!fs.existsSync(modelsDir)) {
    return { errors, warnings, totalCitations, validCitations, driftedCitations };
  }

  const modelFiles = modelLib.walkFiles(modelsDir, (n) => n.endsWith('_NN.md'));

  // Cache normalized headings per source file
  const headingCache = new Map();

  function getHeadingsForSource(relSourcePath) {
    if (headingCache.has(relSourcePath)) {
      return headingCache.get(relSourcePath);
    }
    const fullPath = path.join(nnDir, relSourcePath);
    if (!fs.existsSync(fullPath)) {
      headingCache.set(relSourcePath, null);
      return null;
    }
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const headings = extractHeadingSlugs(content);
      const slugSet = new Set(headings.map((h) => h.slug));
      const entry = { headings, slugSet, content };
      headingCache.set(relSourcePath, entry);
      return entry;
    } catch {
      headingCache.set(relSourcePath, null);
      return null;
    }
  }

  for (const rel of modelFiles) {
    const modelRelPath = `models/${rel.replace(/\\/g, '/')}`;
    const modelFullPath = path.join(modelsDir, rel);
    const content = fs.readFileSync(modelFullPath, 'utf8');

    // Parse units / elements to associate citation with element name
    const lines = content.split(/\r?\n/);
    let currentElement = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const elemMatch = line.match(/^## NN [^:]+:\s*(.+?)\s*$/);
      if (elemMatch) {
        currentElement = elemMatch[1].trim();
      }

      if (line.trim().startsWith('sources::')) {
        const refs = modelLib.scrapeSourceRefs(line);
        for (const ref of refs) {
          totalCitations++;

          // Skip turn pointers with @ syntax or model-to-model references
          if (ref.includes('@') || ref.startsWith('models/')) {
            validCitations++;
            continue;
          }

          const hashIdx = ref.indexOf('#');
          const filePart = (hashIdx >= 0 ? ref.substring(0, hashIdx) : ref)
            .replace(/^sources\/nn\//, '')
            .trim();
          const slugPart = hashIdx >= 0 ? ref.substring(hashIdx + 1).trim() : null;

          if (!filePart) continue;

          // Resolve target file path (could be bare name or relative path)
          let targetRelPath = filePart;
          let sourceData = getHeadingsForSource(targetRelPath);

          if (!sourceData) {
            // Search if file exists under any subtree of sources/nn/
            const found = findSourceUnderNn(nnDir, filePart);
            if (found) {
              targetRelPath = found;
              sourceData = getHeadingsForSource(targetRelPath);
            }
          }

          if (!sourceData) {
            const msg = `${modelRelPath}${currentElement ? ` (${currentElement})` : ''}: sources:: "${ref}" does not resolve to any file in sources/nn/.`;
            errors.push(msg);
            driftedCitations.push({
              modelFile: modelRelPath,
              elementName: currentElement || undefined,
              citation: ref,
              sourceFile: filePart,
              headingSlug: slugPart || '',
              reason: 'missing_file',
            });
            continue;
          }

          if (slugPart) {
            if (!sourceData.slugSet.has(slugPart)) {
              // Heading slug is missing in normalized source!
              const suggestions = findClosestSlugs(slugPart, Array.from(sourceData.slugSet));
              const suggStr = suggestions.length > 0 ? ` (Did you mean: ${suggestions.map(s => `#${s}`).join(', ')}?)` : '';
              const msg = `${modelRelPath}${currentElement ? ` (${currentElement})` : ''}: sources:: "${ref}" references missing heading "#${slugPart}" in "sources/nn/${targetRelPath}"${suggStr}.`;
              errors.push(msg);
              driftedCitations.push({
                modelFile: modelRelPath,
                elementName: currentElement || undefined,
                citation: ref,
                sourceFile: targetRelPath,
                headingSlug: slugPart,
                reason: 'missing_heading',
                suggestions,
              });
            } else {
              validCitations++;
            }
          } else {
            validCitations++;
          }
        }
      }
    }
  }

  return {
    errors,
    warnings,
    totalCitations,
    validCitations,
    driftedCitations,
  };
}

/**
 * Helper to locate a source file across subtrees in sources/nn/
 */
function findSourceUnderNn(nnDir, fileName) {
  if (!fs.existsSync(nnDir)) return null;
  const base = path.basename(fileName);
  const queue = [nnDir];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory() && !ent.name.startsWith('.')) {
        queue.push(full);
      } else if (ent.isFile() && (ent.name === base || ent.name === fileName)) {
        return path.relative(nnDir, full).replace(/\\/g, '/');
      }
    }
  }
  return null;
}

/**
 * Find closest matching slugs based on substring or token overlap
 */
function findClosestSlugs(targetSlug, availableSlugs) {
  const targetTokens = new Set(targetSlug.split('-').filter(Boolean));
  const scored = availableSlugs.map((slug) => {
    const tokens = slug.split('-').filter(Boolean);
    let overlap = 0;
    for (const t of tokens) {
      if (targetTokens.has(t)) overlap++;
    }
    return { slug, score: overlap / Math.max(tokens.length, targetTokens.size) };
  });

  return scored
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.slug);
}

/**
 * Check impact on models specifically for a set of recently modified/archived sources.
 *
 * @param {Array<{ baseName: string, displayOutPath: string, snapshot?: { version: string, archivePath: string } }>} changedSources
 * @param {string} projectDir
 * @returns {Array<{ source: string, affectedModels: Array<{ modelFile: string, element?: string, citation: string, status: string }> }>}
 */
function checkScanImpact(changedSources, projectDir) {
  if (!changedSources || changedSources.length === 0) return [];

  const audit = auditModelCitations(projectDir);
  const results = [];

  for (const changed of changedSources) {
    const matchName = changed.baseName.toLowerCase();
    const matchPath = changed.displayOutPath.toLowerCase();

    const affected = audit.driftedCitations.filter((dc) => {
      const dcSource = dc.sourceFile.toLowerCase();
      return dcSource === matchPath || dcSource === `${matchName}.md` || dcSource.endsWith(`/${matchName}.md`);
    });

    if (affected.length > 0) {
      results.push({
        source: changed.displayOutPath,
        affectedModels: affected.map((a) => ({
          modelFile: a.modelFile,
          element: a.elementName,
          citation: a.citation,
          status: a.reason,
          suggestions: a.suggestions,
        })),
      });
    }
  }

  return results;
}

module.exports = {
  auditModelCitations,
  checkScanImpact,
  findClosestSlugs,
};
