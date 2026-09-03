#!/usr/bin/env node

/**
 * llm-wiki-compiler.js
 *
 * Deterministic compiler for the LLM Wiki-style source registry.
 * - Parses all normalized NN source files in `sources/nn/` to extract detected entities.
 * - Generates the consolidated index `sources/nn/entities.md` using WikiLinks.
 * - Generates `resultados_objetos.json` at the project root with the lightweight key-value mapping.
 *
 * Usage:
 *   node scripts/llm-wiki-compiler.js --compile --src <project-dir>
 *   node scripts/llm-wiki-compiler.js --list --src <project-dir>
 */

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { extractHeadingSlugs } = require('./markdown-utils');

function walkNNFiles(dir) {
  const results = [];
  const walk = (d, rel) => {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(d, entry.name);
      const relPath = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(abs, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (relPath === 'index.md' || relPath === 'entities.md') continue;
        results.push(relPath);
      }
    }
  };
  walk(dir, '');
  return results.sort();
}

function parseEntitiesFromNNFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const entities = [];
  let inEntitiesSection = false;

  // Heading-slug anchors must match exactly what a citation validator would
  // compute for this same document, so slugs are derived once for the whole
  // file (duplicate headings disambiguated in document order) and looked up
  // by line number.
  const slugByLine = new Map(extractHeadingSlugs(content).map((h) => [h.lineIndex, h.slug]));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^# NN Entities\b/.test(line)) {
      inEntitiesSection = true;
      continue;
    }
    if (inEntitiesSection && /^# (?!#)/.test(line)) {
      // Out of Entities section, entered another top-level section
      inEntitiesSection = false;
    }

    if (inEntitiesSection && /^## NN Entities:\s*(.+)$/.test(line)) {
      const match = line.match(/^## NN Entities:\s*(.+)$/);
      if (match) {
        entities.push({
          name: match[1].trim(),
          slug: slugByLine.get(i) || ''
        });
      }
    }
  }
  return entities;
}

function getSourceFileBasename(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const m = content.match(/^\s*source_file:\s*"?([^"\n]+)"?/m);
    if (m) {
      return path.basename(m[1].trim());
    }
  } catch (err) {}
  return path.basename(filePath);
}

function compileWiki(projectDir) {
  const nnDir = path.join(projectDir, 'sources', 'nn');
  if (!fs.existsSync(nnDir)) {
    console.error(`Error: sources/nn/ directory not found in ${projectDir}`);
    process.exit(1);
  }

  const files = walkNNFiles(nnDir);
  const entitiesMap = new Map(); // name -> [{ file, slug }]
  const jsonReport = {};

  for (const relFile of files) {
    const absPath = path.join(nnDir, relFile);
    const relFilePosix = relFile.replace(/\\/g, '/');
    const entities = parseEntitiesFromNNFile(absPath);

    // Add to JSON report
    const originalFilename = getSourceFileBasename(absPath);
    const currentList = jsonReport[originalFilename] || [];
    jsonReport[originalFilename] = Array.from(new Set([...currentList, ...entities.map(e => e.name.toLowerCase())]));

    for (const ent of entities) {
      if (!entitiesMap.has(ent.name)) {
        entitiesMap.set(ent.name, []);
      }
      entitiesMap.get(ent.name).push({
        file: `sources/nn/${relFilePosix}`,
        slug: ent.slug
      });
    }
  }

  // Write sources/nn/entities.md
  const entitiesFile = path.join(nnDir, 'entities.md');
  let mdContent = '---\n' +
    'specification_version: "V_0-1-0"\n' +
    'level: 3\n' +
    'title: "Compiled Ingestion Glossary"\n' +
    '---\n\n' +
    '# NN index\n\n';

  const sortedNames = Array.from(entitiesMap.keys()).sort();
  for (const name of sortedNames) {
    mdContent += `* [[${name}]]\n`;
  }

  mdContent += '\n# NN Entities\n';
  for (const name of sortedNames) {
    const occurrences = entitiesMap.get(name);
    mdContent += `\n## NN Entities: ${name}\n`;
    if (occurrences.length === 1) {
      mdContent += `sources:: ${occurrences[0].file}#${occurrences[0].slug}\n`;
    } else {
      const listStr = occurrences.map(o => `${o.file}#${o.slug}`).join(', ');
      mdContent += `sources:: [${listStr}]\n`;
    }
  }

  fs.writeFileSync(entitiesFile, mdContent, 'utf8');
  console.log(`Compiled LLM Wiki index created at: sources/nn/entities.md (Registered ${sortedNames.length} unique entities)`);

  // Write resultados_objetos.json at project root
  const jsonPath = path.join(projectDir, 'resultados_objetos.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
  console.log(`JSON report created at: ${jsonPath}`);
}

function listPendingImages(projectDir) {
  const nnDir = path.join(projectDir, 'sources', 'nn');
  if (!fs.existsSync(nnDir)) {
    console.error(`Error: sources/nn/ directory not found in ${projectDir}`);
    process.exit(1);
  }

  const files = walkNNFiles(nnDir);
  const pending = [];

  for (const relFile of files) {
    const absPath = path.join(nnDir, relFile);
    const content = fs.readFileSync(absPath, 'utf8');
    if (content.includes('agent-query:') && !content.includes('## AI Visual Extraction Report')) {
      const match = content.match(/\[IMAGE:\s*([^\]]+)\]/);
      if (match) {
        pending.push({
          nnFile: path.join('sources', 'nn', relFile).replace(/\\/g, '/'),
          imageFile: match[1].trim()
        });
      }
    }
  }

  console.log(JSON.stringify(pending, null, 2));
}

function main() {
  const argv = minimist(process.argv.slice(2));
  const projectDir = argv.src || process.cwd();

  if (argv.compile) {
    compileWiki(projectDir);
  } else if (argv.list) {
    listPendingImages(projectDir);
  } else {
    console.error('Usage: node scripts/llm-wiki-compiler.js --compile|--list --src <project-dir>');
    process.exit(1);
  }
}

main();
