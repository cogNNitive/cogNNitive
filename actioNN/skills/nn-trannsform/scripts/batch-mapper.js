#!/usr/bin/env node

/**
 * batch-mapper.js
 *
 * Interactive CLI batch mapper for iNNfo models.
 * - Reads compiled entities from `sources/nn/entities.md`.
 * - Reads the active Level 3 model in `models/` and resolves its concepts.
 * - Displays a clean ASCII table of candidate elements.
 * - Prompts the user to select which elements to import (supports lists, ranges like 1-3, 5).
 * - Appends the elements to the correct concept section in the Level 3 model, updating index.md.
 *
 * Usage:
 *   node scripts/batch-mapper.js --model <model-file-path> --src <project-dir>
 */

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const prompts = require('prompts');

function parseEntitiesFromWiki(entitiesFilePath) {
  if (!fs.existsSync(entitiesFilePath)) return [];
  const content = fs.readFileSync(entitiesFilePath, 'utf8');
  const lines = content.split('\n');
  const entities = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^## NN Entities:\s*(.+)$/.test(line)) {
      if (current) entities.push(current);
      current = {
        name: line.match(/^## NN Entities:\s*(.+)$/)[1].trim(),
        sources: '',
        lineNum: i + 1
      };
    } else if (current && /^sources::\s*(.+)$/.test(line)) {
      current.sources = line.match(/^sources::\s*(.+)$/)[1].trim();
    }
  }
  if (current) entities.push(current);
  return entities;
}

function parseModelConcepts(modelPath) {
  if (!fs.existsSync(modelPath)) return [];
  const content = fs.readFileSync(modelPath, 'utf8');
  const lines = content.split('\n');
  const concepts = [];

  for (const line of lines) {
    if (/^# NN\s+(?!index|matrices:)(.+)$/.test(line)) {
      const name = line.match(/^# NN\s+(.+)$/)[1].trim();
      concepts.push(name);
    }
  }
  return concepts;
}

function suggestConcept(entityName, concepts) {
  const nameLower = entityName.toLowerCase();
  for (const c of concepts) {
    const cLower = c.toLowerCase();
    if (cLower.includes(nameLower) || nameLower.includes(cLower)) {
      return c;
    }
    // Plural/Singular helper
    if (cLower.replace(/s$/, '') === nameLower || nameLower.replace(/s$/, '') === cLower) {
      return c;
    }
  }
  // Default to the first available concept or a generic one
  return concepts[0] || 'Items';
}

function parseRanges(input, maxVal) {
  const parts = input.split(',').map(p => p.trim());
  const selected = new Set();

  for (const part of parts) {
    if (part.toLowerCase() === 'all') {
      for (let i = 1; i <= maxVal; i++) selected.add(i);
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= maxVal) selected.add(i);
        }
      }
    } else {
      const val = Number(part);
      if (!isNaN(val) && val >= 1 && val <= maxVal) {
        selected.add(val);
      }
    }
  }
  return Array.from(selected).sort((a, b) => a - b);
}

function appendElementToModel(modelPath, conceptName, elementName, sourceRef) {
  const content = fs.readFileSync(modelPath, 'utf8');
  const lines = content.split('\n');
  let insertIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (new RegExp(`^# NN\\s+${conceptName}\\b`, 'i').test(line)) {
      insertIdx = i;
      // Walk forward to find either the next top-level heading or end of file
      for (let j = i + 1; j < lines.length; j++) {
        if (/^# (?!#)/.test(lines[j])) {
          insertIdx = j - 1;
          break;
        }
        if (j === lines.length - 1) {
          insertIdx = lines.length;
        }
      }
      break;
    }
  }

  if (insertIdx === -1) {
    // Concept section not found, append at the end
    insertIdx = lines.length;
    lines.push(`\n# NN ${conceptName}\n`);
  }

  const elementBlock = [
    `\n## NN ${conceptName}: ${elementName}`,
    `sources:: ${sourceRef}`,
    ``,
    `Auto-imported from image sources.`
  ];

  lines.splice(insertIdx, 0, ...elementBlock);
  fs.writeFileSync(modelPath, lines.join('\n'), 'utf8');
}

async function main() {
  const argv = minimist(process.argv.slice(2));
  const projectDir = argv.src || process.cwd();
  let modelPath = argv.model;

  if (!modelPath) {
    // Try to find a model in models/
    const modelsDir = path.join(projectDir, 'models');
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('_NN.md'));
      if (files.length === 1) {
        modelPath = path.join(modelsDir, files[0]);
        console.log(`Auto-selected single model found: ${files[0]}`);
      } else if (files.length > 1) {
        // Prompt the user to select the model interactively
        const modelResponse = await prompts({
          type: 'select',
          name: 'selectedModel',
          message: 'Multiple models found. Please select the target model:',
          choices: files.map(f => ({ title: f, value: path.join(modelsDir, f) }))
        });
        if (!modelResponse.selectedModel) {
          console.error('Error: No model selected.');
          process.exit(1);
        }
        modelPath = modelResponse.selectedModel;
      }
    }
  }

  if (!modelPath || !fs.existsSync(modelPath)) {
    console.error('Error: Please specify a valid active model file using --model <path>');
    process.exit(1);
  }

  const entitiesFile = path.join(projectDir, 'sources', 'nn', 'entities.md');
  const entities = parseEntitiesFromWiki(entitiesFile);

  if (entities.length === 0) {
    console.log(`No entities found in ${entitiesFile}. Did you run --compile first?`);
    return;
  }

  const concepts = parseModelConcepts(modelPath);
  if (concepts.length === 0) {
    console.error(`Error: No active concepts found in model ${modelPath}`);
    process.exit(1);
  }

  console.log(`\n=== Batch Import Candidates for: ${path.basename(modelPath)} ===\n`);
  
  const candidates = entities.map((ent, idx) => {
    const suggested = suggestConcept(ent.name, concepts);
    const cleanName = ent.name.charAt(0).toUpperCase() + ent.name.slice(1);
    const defaultName = `${cleanName} (${path.basename(ent.sources.split('#')[0], '.md')})`;
    return {
      id: idx + 1,
      entity: ent.name,
      sources: ent.sources,
      suggestedConcept: suggested,
      suggestedName: defaultName
    };
  });

  // Display table
  console.log('ID  | Entity Name     | Suggested Concept | Suggested Element Name');
  console.log('------------------------------------------------------------------------');
  for (const cand of candidates) {
    console.log(
      `${String(cand.id).padEnd(3)} | ` +
      `${cand.entity.padEnd(15)} | ` +
      `${cand.suggestedConcept.padEnd(17)} | ` +
      `${cand.suggestedName}`
    );
  }
  console.log();

  const response = await prompts([
    {
      type: 'text',
      name: 'selection',
      message: 'Select IDs to import (e.g. 1-3, 5, or "all"):',
      validate: val => val.trim().length > 0 ? true : 'Selection cannot be empty'
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with importing the selected elements?',
      initial: true
    }
  ]);

  if (!response.confirm || !response.selection) {
    console.log('Mapping cancelled.');
    return;
  }

  const selectedIds = parseRanges(response.selection, candidates.length);
  console.log(`Importing ${selectedIds.length} element(s) into the model...`);

  for (const id of selectedIds) {
    const cand = candidates[id - 1];
    appendElementToModel(modelPath, cand.suggestedConcept, cand.suggestedName, cand.sources);
    console.log(`  + Imported: "${cand.suggestedName}" into concept "${cand.suggestedConcept}"`);
  }

  console.log('\nBatch mapping complete!');
}

main().catch(console.error);
