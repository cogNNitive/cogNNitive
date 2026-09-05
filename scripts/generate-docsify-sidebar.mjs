#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function printUsage() {
  console.log(`
Usage:
  node scripts/generate-docsify-sidebar.mjs <model-path> [options]

Options:
  --output, -o <file>   Target sidebar markdown path (default: _sidebar.md in model dir)
  --dry-run             Print output to stdout without writing to file
  --help, -h            Show this help message
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let modelPath = null;
  let outputPath = null;
  let dryRun = false;
  let skipFileCheck = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i];
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--skip-file-check') {
      skipFileCheck = true;
    } else if (!arg.startsWith('-') && !modelPath) {
      modelPath = arg;
    }
  }

  if (!modelPath) {
    console.error('❌ Error: Model path is required.');
    printUsage();
    process.exit(1);
  }

  return { modelPath, outputPath, dryRun, skipFileCheck };
}

function parseNNModel(content) {
  const lines = content.split(/\r?\n/);
  const sections = new Map();
  const pages = [];
  let currentEntity = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match entity headers: ## NN Concept: EntityName
    const entityMatch = trimmed.match(/^##\s+NN\s+([^:]+):\s*(.+)$/);
    if (entityMatch) {
      const [, concept, name] = entityMatch;
      currentEntity = {
        concept: concept.trim(),
        id: name.trim(),
        fields: {},
      };

      if (currentEntity.concept === 'Section') {
        sections.set(currentEntity.id, currentEntity);
      } else if (currentEntity.concept === 'Page') {
        pages.push(currentEntity);
      }
      continue;
    }

    // Match fields: key:: value
    const fieldMatch = trimmed.match(/^([a-zA-Z0-9_-]+)::\s*(.*)$/);
    if (fieldMatch && currentEntity) {
      const [, key, val] = fieldMatch;
      let cleanVal = val.trim();
      // Unwrap [[Target]] reference if present
      const refMatch = cleanVal.match(/^\[\[(.*)\]\]$/);
      if (refMatch) {
        cleanVal = refMatch[1].trim();
      }
      currentEntity.fields[key] = cleanVal;
    }
  }

  return { sections, pages };
}

function generateSidebar() {
  const { modelPath, outputPath, dryRun, skipFileCheck } = parseArgs();

  const resolvedModelPath = path.isAbsolute(modelPath)
    ? modelPath
    : path.resolve(process.cwd(), modelPath);

  if (!fs.existsSync(resolvedModelPath)) {
    console.error(`❌ Error: Model file not found at: ${resolvedModelPath}`);
    process.exit(1);
  }

  const modelDir = path.dirname(resolvedModelPath);
  const targetOutput = outputPath
    ? (path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath))
    : path.join(modelDir, '_sidebar.md');

  console.log(`🔍 [Docsify Generator] Reading model: ${path.relative(repoRoot, resolvedModelPath)}`);
  const content = fs.readFileSync(resolvedModelPath, 'utf8');
  const { sections, pages } = parseNNModel(content);

  console.log(`📋 Found ${sections.size} sections and ${pages.length} pages in model.`);

  // Audit and validate sources
  if (!skipFileCheck) {
    let auditErrors = 0;
    for (const page of pages) {
      const source = page.fields.source;
      if (!source) {
        console.error(`❌ [Audit Failure] Page "${page.id}" is missing required "source::" field.`);
        auditErrors++;
        continue;
      }

      // Check if source file is a local relative file
      if (!source.startsWith('http://') && !source.startsWith('https://')) {
        const sourceFilePath = path.join(modelDir, source);
        if (!fs.existsSync(sourceFilePath)) {
          console.error(`❌ [Missing File] Page "${page.id}" source not found: ${sourceFilePath}`);
          auditErrors++;
        }
      }
    }

    if (auditErrors > 0) {
      console.error(`\n❌ Validation failed: ${auditErrors} error(s) encountered in model source references.`);
      process.exit(1);
    }

    console.log(`✅ All source files verified on disk.`);
  } else {
    console.log(`⚠️ Skipping filesystem presence checks (--skip-file-check enabled).`);
  }

  // Sort sections
  const sortedSections = Array.from(sections.values()).sort((a, b) => {
    const orderA = parseInt(a.fields.section_order || a.fields.order || '999', 10);
    const orderB = parseInt(b.fields.section_order || b.fields.order || '999', 10);
    return orderA - orderB;
  });

  // Group pages by section
  const sectionPages = new Map();
  const rootPages = [];

  for (const page of pages) {
    const parent = page.fields.parent;
    if (parent && sections.has(parent)) {
      if (!sectionPages.has(parent)) {
        sectionPages.set(parent, []);
      }
      sectionPages.get(parent).push(page);
    } else {
      rootPages.push(page);
    }
  }

  const sortPages = (pageList) => {
    return pageList.sort((a, b) => {
      const orderA = parseInt(a.fields.order || '999', 10);
      const orderB = parseInt(b.fields.order || '999', 10);
      return orderA - orderB;
    });
  };

  const lines = [];

  // 1. Root-level pages
  for (const page of sortPages(rootPages)) {
    const title = page.fields.title || page.id;
    const route = page.fields.route || page.fields.source.replace(/\.md$/, '');
    lines.push(`- [${title}](${route})`);
  }

  // 2. Sections and their children
  for (const section of sortedSections) {
    const pagesForSection = sectionPages.get(section.id) || [];
    if (pagesForSection.length === 0) continue;

    if (lines.length > 0) {
      lines.push('');
    }

    const sectionTitle = section.fields.title || section.id;
    lines.push(`- **${sectionTitle}**`);

    for (const page of sortPages(pagesForSection)) {
      const title = page.fields.title || page.id;
      const route = page.fields.route || page.fields.source.replace(/\.md$/, '');
      lines.push(`  - [${title}](${route})`);
    }
  }

  lines.push('');
  const generatedContent = lines.join('\n');

  if (dryRun) {
    console.log('\n--- [Dry Run Output: _sidebar.md] ---');
    console.log(generatedContent);
  } else {
    fs.writeFileSync(targetOutput, generatedContent, 'utf8');
    console.log(`✨ Generated sidebar written to: ${path.relative(repoRoot, targetOutput)}`);
  }
}

generateSidebar();
