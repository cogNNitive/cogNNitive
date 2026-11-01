import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const BLUEPRINT_DIR = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts', 'video-script');
export const SPEC_PATH = path.join(BLUEPRINT_DIR, 'spec_NN.md');
export const DOC_PATH = path.join(BLUEPRINT_DIR, 'skills', 'nn-video-script', 'references', 'parameters.md');

/** Scope columns, in cascade-reading order (broadest first). Key = the spec's `concept::` name. */
const SCOPES = [
  { concept: 'Video Defaults', label: 'Defaults' },
  { concept: 'Series', label: 'Series' },
  { concept: 'Preset', label: 'Preset' },
  { concept: 'Video', label: 'Video' },
  { concept: 'Scene', label: 'Scene' },
  { concept: 'Layer', label: 'Layer' },
];

const SET = '●';
const UNSET = '·';

function parseValue(raw) {
  const v = raw.trim();
  const list = /^\[(.*)\]$/.exec(v);
  return list ? list[1].split(',').map((s) => s.trim()).filter(Boolean) : [v];
}

/** Reads every `## NN Field Definition: <name>` block of the blueprint, in spec order. */
export function parseFieldDefinitions(specText) {
  const fields = [];
  let current = null;
  for (const line of specText.split(/\r?\n/)) {
    const heading = /^## NN Field Definition: (\S+)\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], concepts: [], type: '', options: [], multiple: false, description: '' };
      fields.push(current);
      continue;
    }
    if (/^#{1,2} /.test(line)) {
      current = null;
      continue;
    }
    const prop = current && /^([a-z_]+)::\s*(.*)$/.exec(line);
    if (!prop) continue;
    const [, key, value] = prop;
    if (key === 'concept') current.concepts = parseValue(value);
    else if (key === 'type') current.type = value.trim();
    else if (key === 'options') current.options = parseValue(value);
    else if (key === 'multiple') current.multiple = value.trim() === 'true';
    else if (key === 'description') current.description = value.trim();
  }
  return fields;
}

/** Reads `validation.conditional_fields` (Layer `type::` value -> required Field names) from the frontmatter. */
export function parseConditionalFields(specText) {
  const declared = {};
  let inBlock = false;
  for (const line of specText.split(/\r?\n/)) {
    if (/^\s*conditional_fields:\s*$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    const m = /^\s*([A-Za-z0-9_-]+):\s*\[([^\]]*)\]/.exec(line);
    if (!m) break;
    declared[m[1]] = m[2].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return declared;
}

function scopesOf(field) {
  if (field.concepts.includes('*')) return SCOPES.map((s) => s.concept);
  for (const c of field.concepts) {
    if (!SCOPES.some((s) => s.concept === c)) {
      throw new Error(`Field ${field.name}: unknown concept "${c}"; add it to SCOPES in generate-video-parameters-doc.mjs`);
    }
  }
  return field.concepts;
}

const code = (items) => items.map((i) => `\`${i}\``).join(', ');

export function renderParametersDoc(fields, conditionalFields) {
  const lines = [];

  lines.push('<!-- GENERATED from spec_NN.md by scripts/generate-video-parameters-doc.mjs. Do not edit by hand. -->');
  lines.push('');
  lines.push('# Video Script Parameter Reference');
  lines.push('');
  lines.push('Every Field the `video-script` blueprint defines, and the scopes where it can be written.');
  lines.push('The authoritative definition is `spec_NN.md`; this page is its generated rendering.');
  lines.push('');
  lines.push('## How scopes resolve');
  lines.push('');
  lines.push('A parameter marked on several scopes is a **cascade parameter**: the nearest scope that sets it wins.');
  lines.push('');
  lines.push('```text');
  lines.push('cli > layer > scene > video > series > domain > blueprint');
  lines.push('```');
  lines.push('');
  lines.push('- **Defaults** is `video-defaults_NN.md`: the `domain` level, with the package copy as the `blueprint` level.');
  lines.push('- **Series** is the episode\'s nearest `*_scope_NN.md`.');
  lines.push('- **Preset** is a named bundle of cascade parameters. A `presets` list is written at Defaults, Series, Video or Scene (never on a Layer) and expands directly under that level, so a Preset beats the outer levels but never the explicit fields of the element that names it.');
  lines.push('- A Preset column mark means the Field can be set inside a Preset.');
  lines.push('');
  lines.push(`Legend: ${SET} can be written at this scope, ${UNSET} cannot.`);
  lines.push('');
  lines.push('## Parameters by scope');
  lines.push('');
  lines.push(`| Parameter | Type | Values | ${SCOPES.map((s) => s.label).join(' | ')} |`);
  lines.push(`|---|---|---|${SCOPES.map(() => ':-:').join('|')}|`);
  for (const f of fields) {
    const scopes = scopesOf(f);
    const type = f.multiple ? `${f.type} (multi)` : f.type;
    const values = f.options.length > 0 ? code(f.options) : '—';
    const marks = SCOPES.map((s) => (scopes.includes(s.concept) ? SET : UNSET)).join(' | ');
    lines.push(`| \`${f.name}\` | ${type} | ${values} | ${marks} |`);
  }
  lines.push('');

  const types = Object.entries(conditionalFields);
  if (types.length > 0) {
    lines.push('## Required by Layer type');
    lines.push('');
    lines.push('A Layer\'s `type::` decides which Fields it needs. At least one of the listed Fields must be present; a cascade parameter is satisfied by its resolved value.');
    lines.push('');
    lines.push('| `type::` | Needs at least one of |');
    lines.push('|---|---|');
    for (const [type, required] of types) lines.push(`| \`${type}\` | ${code(required)} |`);
    lines.push('');
  }

  lines.push('## Parameter details');
  lines.push('');
  for (const f of fields) {
    lines.push(`### \`${f.name}\``);
    lines.push('');
    lines.push(f.description);
    lines.push('');
    lines.push(`Settable at: ${f.concepts.includes('*') ? 'every scope' : code(f.concepts)}.`);
    lines.push('');
  }

  return lines.join('\n');
}

export function syncParametersDoc(options = {}) {
  const { check = false } = options;
  const specText = fs.readFileSync(SPEC_PATH, 'utf8');
  const rendered = renderParametersDoc(parseFieldDefinitions(specText), parseConditionalFields(specText));

  if (check) {
    if (!fs.existsSync(DOC_PATH)) {
      console.error(`FAIL: parameters.md missing at ${DOC_PATH}`);
      return false;
    }
    const current = fs.readFileSync(DOC_PATH, 'utf8');
    if (current.replace(/\r\n/g, '\n') !== rendered) {
      console.error('FAIL: video-script parameters.md is out of sync with spec_NN.md. Run node scripts/generate-video-parameters-doc.mjs');
      return false;
    }
    console.log('OK: video-script parameters.md is in sync with spec_NN.md');
    return true;
  }

  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, rendered, 'utf8');
  console.log(`OK: Generated ${DOC_PATH} from spec_NN.md`);
  return true;
}

if (process.argv[1] === import.meta.filename) {
  const ok = syncParametersDoc({ check: process.argv.includes('--check') });
  process.exit(ok ? 0 : 1);
}
