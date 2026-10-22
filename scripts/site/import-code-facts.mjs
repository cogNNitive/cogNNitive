// Imports code facts (MCP tools, skills) into the site domaiNN as write-once, sidecar-backed
// snapshots under sources/import/code-facts/. Pages cite them as `[<member>@## <name>]`.
// Direct `writeOnce` + `cognitivize`, no raw-import helper, no watch roots (design D6).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { writeOnce, cognitivize } = require('../../skills/nn-sources/scripts/lib/nn-core.generated.cjs');

export const FACTS_DIR = 'sources/import/code-facts';
/** Fact group -> key of `facts` holding its entries. */
const GROUPS = { 'mcp-tools': 'tools', 'skill-commands': 'skills' };

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

function factLine(key, value) {
  const text = Array.isArray(value) ? [...value].map(oneLine).sort(byText).join(', ') : oneLine(value ?? '');
  return text ? `${key}: ${text}` : null;
}

/** Deterministic markdown: one `## <name>` per entry, sorted, facts beneath as `key: value` lines. */
export function renderSnapshot(group, entries) {
  if (!(group in GROUPS)) throw new Error(`unknown fact group "${group}"`);
  if (!Array.isArray(entries) || !entries.length) throw new Error(`group "${group}" has no entries`);
  const names = new Set();
  const blocks = [...entries].sort((a, b) => byText(String(a.name), String(b.name))).map((entry) => {
    const name = oneLine(entry.name ?? '');
    if (!name) throw new Error(`group "${group}" has an entry without a name`);
    if (names.has(name)) throw new Error(`group "${group}" repeats the name "${name}"`);
    names.add(name);
    const lines = Object.keys(entry).filter((k) => k !== 'name').sort(byText).map((k) => factLine(k, entry[k])).filter(Boolean);
    return [`## ${name}`, '', ...lines].join('\n');
  });
  return `${blocks.join('\n\n')}\n`;
}

/**
 * @param {{ domainDir: string, facts: { tools: object[], skills: object[] }, now?: () => Date }} opts
 * @returns {Promise<{ groups: Record<string, { status: 'written' | 'unchanged', path: string, sidecar?: string }> }>}
 */
export async function run({ domainDir, facts, now }) {
  // Render everything first so malformed facts write nothing.
  const rendered = Object.entries(GROUPS).map(([group, key]) => {
    if (!facts || !Array.isArray(facts[key])) throw new Error(`facts.${key} must be an array`);
    return [group, renderSnapshot(group, facts[key])];
  });
  const groups = {};
  for (const [group, text] of rendered) {
    const written = await writeOnce(domainDir, { dir: FACTS_DIR, key: group, ext: 'md' }, text, now ? { now } : {});
    if (written.status === 'deduplicated') {
      groups[group] = { status: 'unchanged', path: written.path };
      continue;
    }
    const side = await cognitivize(domainDir, written.path, now ? { now } : {});
    groups[group] = { status: 'written', path: written.path, sidecar: side.sidecar };
  }
  return { groups };
}

/** Load tools from the built nn-mcp dist and skills from manifest/source.yaml. */
async function loadFacts(repo) {
  const dist = path.join(repo, 'iNNfo', 'packages', 'nn-mcp', 'dist', 'server.js');
  if (!fs.existsSync(dist)) throw new Error('nn-mcp dist is missing; build nn-mcp first');
  const mod = await import(pathToFileURL(dist).href);
  const { parseSourceYaml } = require('../manifest/generate-manifest.js');
  const source = parseSourceYaml(fs.readFileSync(path.join(repo, 'manifest', 'source.yaml'), 'utf8'), repo);
  return {
    tools: mod.toolDefinitions.map((t) => ({ name: t.name, description: t.description })),
    skills: source.skills.map((s) => ({ name: s.name, description: s.description, requires: s.requires ?? [] })),
  };
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const repo = path.resolve(path.dirname(here), '../..');
  const { groups } = await run({ domainDir: path.join(repo, 'site_NN'), facts: await loadFacts(repo) });
  for (const [group, g] of Object.entries(groups)) console.log(`${group}: ${g.status} ${g.path}`);
}
