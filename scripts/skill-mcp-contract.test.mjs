import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

console.log('▶ [skill-mcp-contract] Running Skill MCP Contract & Drift Guard...');

// 1. Extract valid MCP tools from server.ts
const serverTsPath = path.join(ROOT, 'iNNfo', 'packages', 'nn-mcp', 'src', 'server.ts');
const serverContent = fs.readFileSync(serverTsPath, 'utf8');

const toolMatches = [...serverContent.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);
const registeredTools = new Set(toolMatches.filter((name) => name !== 'nn-mcp'));

console.log(`  Found ${registeredTools.size} registered MCP tools in server.ts.`);
assert.ok(
  registeredTools.size >= 15,
  `Expected at least 15 registered tools in server.ts, found ${registeredTools.size}`,
);

// 2. Discover markdown files across skills/ and test/_samples_nn/
function collectMarkdownFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      results = results.concat(collectMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

const targetDirs = [path.join(ROOT, 'skills'), path.join(ROOT, 'test', '_samples_nn')];
const filesToScan = targetDirs.flatMap((d) => collectMarkdownFiles(d));
console.log(`  Scanning ${filesToScan.length} files across skills/ and test/_samples_nn/ for contract violations...`);

const invalidToolCitations = [];
const missingNodeScripts = [];
const phantomRegistryCitations = [];

const retiredToolNames = new Set([
  'list_template_procedures',
  'list_template_skills',
  'prune_orphaned_specs',
  'sync_workspace_manifest',
  'list_models',
  'validate_model',
  'read_model',
  'validate_template',
  'hydrate_template',
  'list_templates',
  'init_model',
  'validate_model_url',
  'check_workspace',
]);

for (const file of filesToScan) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(ROOT, file).split(path.sep).join('/');

  // A. Check for known fake/retired tool names
  for (const retired of retiredToolNames) {
    // Match bare tool citations or nn-mcp_<tool>
    const regex = new RegExp(`\\b(?:nn-mcp_)?${retired}\\b`, 'g');
    if (regex.test(content)) {
      invalidToolCitations.push({ file: relPath, tool: retired });
    }
  }

  // B. Check for nn-mcp_<tool> citations
  const mcpCalls = [...content.matchAll(/nn-mcp_([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
  for (const tool of mcpCalls) {
    if (!registeredTools.has(tool)) {
      invalidToolCitations.push({ file: relPath, tool: `nn-mcp_${tool}` });
    }
  }

  // C. Check for phantom registry
  if (content.includes('build-registry.js') || content.includes('.cogNNitive/skill-registry.md')) {
    phantomRegistryCitations.push(relPath);
  }

  // D. Check for cited `node <path>` scripts (only for skills/)
  if (relPath.startsWith('skills/')) {
    const nodeMatches = [
      ...content.matchAll(/(?:`node\s+|^\s*node\s+)([a-zA-Z0-9_\-\.\/]+\.(?:js|mjs|cjs))/gm),
    ].map((m) => m[1]);
    for (const scriptRel of nodeMatches) {
      if (
        scriptRel.startsWith('-') ||
        scriptRel.includes(' ') ||
        scriptRel.includes('<') ||
        scriptRel.includes('$')
      )
        continue;
      const scriptFullRoot = path.join(ROOT, scriptRel);
      const scriptFullLocal = path.join(path.dirname(file), scriptRel);
      // Also try finding under skills/<skill_name>/scripts/<basename>
      const scriptParts = relPath.split('/');
      const skillRoot =
        scriptParts.length > 1 ? path.join(ROOT, scriptParts[0], scriptParts[1]) : ROOT;
      const scriptFullSkill = path.join(skillRoot, scriptRel);

      const exists =
        fs.existsSync(scriptFullRoot) ||
        fs.existsSync(scriptFullLocal) ||
        fs.existsSync(scriptFullSkill);
      if (!exists) {
        missingNodeScripts.push({ file: relPath, script: scriptRel });
      }
    }
  }
}

// 3. Assertions
assert.equal(
  invalidToolCitations.length,
  0,
  `Found invalid MCP tool citations:\n${invalidToolCitations
    .map((c) => `  - ${c.file}: ${c.tool}`)
    .join('\n')}`,
);

assert.equal(
  phantomRegistryCitations.length,
  0,
  `Found phantom registry citations:\n${phantomRegistryCitations.map((f) => `  - ${f}`).join('\n')}`,
);

assert.equal(
  missingNodeScripts.length,
  0,
  `Found missing node scripts cited in skills:\n${missingNodeScripts
    .map((m) => `  - ${m.file} -> ${m.script}`)
    .join('\n')}`,
);

console.log(
  '✅ [skill-mcp-contract] All skills and samples adhere to the MCP contract, existing node scripts, and zero phantom registry.',
);
