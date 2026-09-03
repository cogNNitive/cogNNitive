const fs = require('fs');
const path = require('path');

/**
 * Lists templates in the traNNsformations directory
 */
function listTemplates(projectDir) {
  const transDir = path.join(projectDir, 'traNNsformations');
  if (!fs.existsSync(transDir)) {
    fs.mkdirSync(transDir, { recursive: true });
    return [];
  }
  return fs.readdirSync(transDir).filter(f => f.endsWith('.md'));
}

/**
 * Recursively collect *.md files under sources/nn/, preserving the path
 * relative to that directory (it mirrors sources/original/'s subfolders).
 * The top-level ingestion manifest (index.md) is excluded.
 */
function collectMarkdownFiles(mdDir) {
  const results = [];
  const walk = (dir, rel) => {
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
 * Fallback heuristic transformer — used only when the agent cannot perform
 * the transformation directly (e.g. context too large).
 *
 * Reads individual markdown files from sources/nn/ and applies template structure.
 */
async function applyTransformation(projectDir, templateName, options = {}) {
  const transDir = path.join(projectDir, 'traNNsformations');
  const mdDir = path.join(projectDir, 'sources', 'nn');

  const cleanTemplateName = path.basename(templateName, '.md').replace(/\s+/g, '_');
  const outputDir = path.join(projectDir, 'artifacts');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const templatePath = path.join(transDir, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  if (!fs.existsSync(mdDir)) {
    throw new Error('Markdown directory sources/nn/ not found. Please run scan first.');
  }

  const mdFiles = collectMarkdownFiles(mdDir);

  if (mdFiles.length === 0) {
    throw new Error('No normalized markdown files found in sources/nn/. Please run scan first.');
  }

  let sourceContent = '';
  for (const f of mdFiles) {
    const content = fs.readFileSync(path.join(mdDir, f), 'utf8');
    sourceContent += `---\n\n# Source File: ${f.replace(/\\/g, '/')}\n\n` + content.trim() + '\n\n';
  }

  const transformedOutput = runHeuristicTransformation(templateName, sourceContent);

  const timestamp = getFormattedTimestamp();
  const outputFileName = `${cleanTemplateName}_${timestamp}.md`;
  const outputPath = path.join(outputDir, outputFileName);

  fs.writeFileSync(outputPath, transformedOutput, 'utf8');

  return {
    outputFileName,
    outputPath,
    content: transformedOutput
  };
}

function runHeuristicTransformation(templateName, sourceContent) {
  const sections = sourceContent.split('---');
  let result = `# Transformation Result: ${path.basename(templateName, '.md')}\n\n`;

  let processedAny = false;
  for (const sec of sections) {
    const lines = sec.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const titleLine = lines.find(l => l.startsWith('# '));
    if (titleLine) {
      const name = titleLine.substring(2).trim();

      const paragraphs = lines.filter(l => !l.startsWith('#') && !l.startsWith('---'));
      const desc = paragraphs[0] || 'No description available.';
      const hist = paragraphs[1] || 'No history available.';

      result += `### ${name}\n`;
      result += `**Description:** ${desc}\n\n`;
      result += `**History:** ${hist}\n\n`;
      result += `**Members:**\n`;
      result += `| Member | Instrument |\n`;
      result += `| --- | --- |\n`;
      result += `| [Name] | [Instrument] |\n\n`;
      result += `---\n\n`;
      processedAny = true;
    }
  }

  if (!processedAny) {
    result += `*No structural headers or data found in input markdown files to transform.*\n`;
  }

  return result;
}

function getFormattedTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${min}${sec}`;
}

module.exports = {
  listTemplates,
  applyTransformation
};