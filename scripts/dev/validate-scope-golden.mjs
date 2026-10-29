#!/usr/bin/env node
/**
 * Manual golden validation of the scope chain on a real video domain.
 *
 *   node scripts/dev/validate-scope-golden.mjs <video-domain-dir> [--keep]
 *
 * With `--elements` it validates element scopes instead (see runElements below):
 *
 *   node scripts/dev/validate-scope-golden.mjs --elements [<video-domain-dir>] [--programas=<LC_programas-dir>]
 *
 * Local only, never run by CI (CI covers the reduced fixture, nn-core
 * `src/scope/golden.spec.ts`). The directory is COPIED to a temp folder; markers,
 * values documents and a slotted procedure are added to the COPY only, and the source
 * tree is hashed before and after to prove it was not touched. Needs nn-core built
 * (`npm --workspace=@cognnitive/nn-core run build`).
 *
 * Exit code 0 when every assertion holds; findings (differences between the fold and
 * the data as it is today) are reported, not failed.
 */
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE_DIST = join(REPO, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js');
const FLOOR_DOC = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'video-script', 'defaults', 'video-defaults_NN.md');
const SERIES = ['innteresante', 'villabotijos-today'];
/** Expected music today, from the maintainer brief and checked against the data below. */
const EXPECTED_MUSIC = { innteresante: 'jazz.mp3', 'villabotijos-today': 'pasodoble-loop.m4a' };

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const elementsMode = args.includes('--elements');
const programasDir = args.find((a) => a.startsWith('--programas='))?.slice('--programas='.length);
const source = args.find((a) => !a.startsWith('--'));
const usage = [
  'usage: node scripts/dev/validate-scope-golden.mjs <video-domain-dir> [--keep]',
  '       node scripts/dev/validate-scope-golden.mjs --elements [<video-domain-dir>] [--programas=<LC_programas-dir>] [--keep]',
].join('\n');
const sourceMissing = !source || !existsSync(source);
if (elementsMode ? sourceMissing && !programasDir : sourceMissing) {
  console.error(usage);
  process.exit(2);
}
if (source && sourceMissing) {
  console.error(`not found: ${source}\n${usage}`);
  process.exit(2);
}
if (programasDir && !existsSync(join(programasDir, 'kNNowledge', 'LC_programas_Tutorias_NN.md'))) {
  console.error(`--programas must point at the LC_programas domaiNN (kNNowledge/LC_programas_Tutorias_NN.md not found)\n${usage}`);
  process.exit(2);
}
if (!existsSync(CORE_DIST)) {
  console.error('nn-core is not built: run `npm --workspace=@cognnitive/nn-core run build` first.');
  process.exit(2);
}
const core = await import(pathToFileURL(CORE_DIST).href);
/** The naming contract's predicate (the one definition of what a `_NN.md` name is). */
const { isNNName } = createRequire(import.meta.url)(join(REPO, 'skills', 'nn-preflight', 'scripts', 'lib', 'naming-contract.generated.cjs'));

const results = [];
const findings = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -- ${detail}` : ''}`);
};
const finding = (text) => {
  findings.push(text);
  console.log(`FIND  ${text}`);
};

// ---------------------------------------------------------------- helpers

/** @param {string} dir @returns {string[]} files, relative POSIX, sorted */
function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

function hashTree(dir) {
  const h = createHash('sha256');
  const files = listFiles(dir);
  for (const f of files) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(dir, f)));
    h.update('\0');
  }
  return { digest: h.digest('hex'), count: files.length };
}

const read = (root, rel) => readFileSync(join(root, rel), 'utf-8');
const write = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text, 'utf-8');
};
const parentSpec = (name) => `parent_spec:\n  name: "${name}"\n  url: "https://example.invalid/${name}.md"\n`;
const fieldOf = (text, name) => text.match(new RegExp(`^${name}:: (.+)$`, 'm'))?.[1].trim() ?? null;
const baseName = (p) => String(p).split('/').pop();

/** The episode folders of a series: assets/<slug>/ holding exactly the main script document. */
function episodesOf(root, series) {
  const assets = join(root, 'series', series, 'assets');
  const out = [];
  for (const e of readdirSync(assets, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const doc = `${e.name}_video-script_${series}_NN.md`;
    if (existsSync(join(assets, e.name, doc))) out.push({ slug: e.name, doc: `series/${series}/assets/${e.name}/${doc}` });
  }
  return out;
}

/** Values that today live as prose / JSON / `## NN Video` blocks, hoisted to the series marker. */
function seriesValues(root, series) {
  const dir = join('series', series);
  const template = read(root, join(dir, 'script_template.md'));
  const json = existsSync(join(root, dir, 'video.series.json')) ? JSON.parse(read(root, join(dir, 'video.series.json'))) : null;
  const seriesDoc = readdirSync(join(root, dir)).find((f) => f.endsWith('_video_NN.md'));
  const voices = [...read(root, join(dir, seriesDoc)).matchAll(/^voice_id:: (.+)$/gm)].map((m) => m[1].trim());
  const counts = voices.reduce((a, v) => ((a[v] = (a[v] || 0) + 1), a), {});
  const voice = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const music = json?.defaultMusic ?? fieldOf(template, 'music');
  const volume = json?.defaultMusicVolume ?? fieldOf(template, 'music_volume');
  const transition = json?.defaultTransition ?? fieldOf(template, 'transition');
  return { music, volume: volume === null ? null : Number(volume), transition, voice, voiceCounts: counts, source: json ? 'video.series.json' : 'script_template.md' };
}

// ---------------------------------------------------------------- --elements mode

/**
 * Element scopes on real domains, read-only on the sources: the video scripts' Video and
 * Scene elements, and the LC_programas Tutorias document (Programa and Prestacion).
 * `scope_elements` is added to a COPY only. LC_programas holds personal data, so its part
 * prints counts and key names only: never a title, a slug, a value or an error detail.
 */
async function runElements() {
  const sources = [];
  const lines = (n) => String(n).padStart(2);
  const freq = (items) => {
    const m = new Map();
    for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  };
  const addDecls = (text, decls) => {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) throw new Error('document has no frontmatter');
    if (/^scope_elements:/m.test(m[1])) throw new Error('document already declares scope_elements');
    return text.replace(m[0], `---\n${m[1]}\nscope_elements:\n${decls}\n---`);
  };
  const resolveOk = (loaded, key, strategy = 'override') => {
    const r = core.resolve(loaded, key, strategy);
    if (!r.ok) throw new Error(`${key}: ${r.code}`);
    return r;
  };

  // ------------------------------------------------------------ video scripts
  if (source) {
    console.log(`\n== video: ${source}`);
    const before = hashTree(source);
    sources.push({ label: 'video tree', dir: source, before, hash: () => hashTree(source) });
    const work = mkdtempSync(join(tmpdir(), 'scope-elements-video-'));
    cpSync(source, work, { recursive: true });
    if (!existsSync(join(work, 'domaiNN_NN.md'))) write(work, 'domaiNN_NN.md', '---\ntitle: video_NN\n---\n# video_NN\n');

    const deviations = {};
    for (const series of SERIES) {
      const v = seriesValues(work, series);
      const fields = [`music:: ${v.music}`, v.volume === null ? null : `music_volume:: ${v.volume}`, v.transition ? `transition:: ${v.transition}` : null, `voice_id:: ${v.voice}`].filter(Boolean).join('\n');
      write(work, `series/${series}/${series}_scope_NN.md`, `---\nlevel: 3\n${parentSpec('series_V_0-1-0')}title: "${series}"\nscope: true\n---\n\n# NN Series\n\n## NN Series: ${series}\n${fields}\n`);

      const rows = [];
      for (const ep of episodesOf(work, series)) {
        const p = join(work, ep.doc);
        writeFileSync(p, addDecls(readFileSync(p, 'utf-8'), '  - concept: Video\n  - concept: Scene'), 'utf-8');
        const listed = core.listScopeElements(p);
        if (!listed.ok) { check(`${series}/${ep.slug}: elements list`, false, `${listed.code}: ${listed.detail}`); continue; }
        const scenes = listed.elements.filter((e) => e.concept === 'Scene');
        const perScene = [];
        let failed = 0;
        for (const sc of scenes) {
          const r = core.loadElementChain(p, { concept: 'Scene', slug: sc.slug }, { floorDoc: floorDocEl });
          if (!r.ok) { failed++; continue; }
          const music = resolveOk(r.loaded, 'music');
          const volume = resolveOk(r.loaded, 'music_volume');
          allResolutionsEl.push(music, volume);
          perScene.push({
            music: baseName(music.value ?? ''),
            volume: volume.present ? volume.value : null,
            ownVolume: volume.explain.winner?.scope?.includes('#Scene/') ?? false,
            ownMusic: music.explain.winner?.scope?.includes('#Scene/') ?? false,
          });
        }
        check(`${series}/${ep.slug}: every Scene (${scenes.length}) loads an element chain`, failed === 0 && scenes.length > 0, `${failed} failed`);
        rows.push({ slug: ep.slug, scenes: scenes.length, perScene });
      }

      console.log(`   ${series}: series music ${baseName(v.music)}, volume ${v.volume}`);
      for (const row of rows) {
        const vols = freq(row.perScene.map((s) => s.volume)).map(([k, n]) => `${k}x${n}`).join(' ');
        const tracks = freq(row.perScene.map((s) => s.music)).map(([k, n]) => `${k}x${n}`).join(' ');
        const own = row.perScene.filter((s) => s.ownVolume).length;
        console.log(`      ${row.slug.padEnd(40)} scenes ${lines(row.scenes)} | own volume ${lines(own)} | volumes ${vols} | music ${tracks}`);
      }
      deviations[series] = {
        scripts: rows.length,
        volume: rows.filter((r) => r.perScene.some((s) => s.volume !== v.volume)),
        music: rows.filter((r) => r.perScene.some((s) => s.music !== baseName(v.music))),
        seriesVolume: v.volume,
        seriesMusic: baseName(v.music),
      };
    }

    // The known L1.4 deviations, now read from the scene elements that really carry them.
    const inn = deviations.innteresante;
    const innVolumes = freq(inn.volume.flatMap((r) => [...new Set(r.perScene.map((s) => s.volume).filter((x) => x !== inn.seriesVolume))]));
    check(`innteresante: ${inn.volume.length} of ${inn.scripts} scripts deviate from the series volume ${inn.seriesVolume} (L1.4: 5 of 8)`, inn.volume.length === 5, inn.volume.map((r) => r.slug).join(', '));
    check('innteresante: the deviating volumes are 0.06 (4 scripts) and 0.2 (1 script) (L1.4)', JSON.stringify(innVolumes.map(([k, n]) => [k, n]).sort()) === JSON.stringify([[0.06, 4], [0.2, 1]]), JSON.stringify(innVolumes));
    check('innteresante: exactly one script uses another track, elevator.mp3 (L1.4)', inn.music.length === 1 && inn.music[0].perScene.some((s) => s.music === 'elevator.mp3'), inn.music.map((r) => r.slug).join(', '));
    const vt = deviations['villabotijos-today'];
    check(`villabotijos-today: exactly one of ${vt.scripts} scripts deviates from the series volume ${vt.seriesVolume}: casimiro-mahou at 0.1 (L1.4)`, vt.volume.length === 1 && vt.volume[0].slug === 'casimiro-mahou' && vt.volume[0].perScene.some((s) => s.volume === 0.1), vt.volume.map((r) => r.slug).join(', '));
    check('villabotijos-today: no script uses another track', vt.music.length === 0, vt.music.map((r) => r.slug).join(', '));
    const extra = [...inn.volume, ...vt.volume].filter((r) => r.perScene.some((s) => !s.ownVolume && s.volume !== null)).length;
    console.log(`      scripts whose deviating scenes mix own and inherited volumes: ${extra}`);
    if (!keep) rmSync(work, { recursive: true, force: true });
    else console.log(`kept video copy: ${work}`);
  }

  // ------------------------------------------------------------ LC_programas
  if (programasDir) {
    console.log('\n== LC_programas (counts and key names only; the data is personal)');
    const file = join(programasDir, 'kNNowledge', 'LC_programas_Tutorias_NN.md');
    const hashFile = () => createHash('sha256').update(readFileSync(file)).digest('hex');
    sources.push({ label: 'LC_programas Tutorias document', before: { digest: hashFile(), count: 1 }, hash: () => ({ digest: hashFile(), count: 1 }) });
    const work = mkdtempSync(join(tmpdir(), 'scope-elements-lc-'));
    write(work, 'domaiNN_NN.md', '---\ntitle: lc-copy\n---\n# lc-copy\n');
    const PRESTACION = 'Prestación de Servicios';
    const copy = 'kNNowledge/LC_programas_Tutorias_NN.md';
    write(work, copy, addDecls(readFileSync(file, 'utf-8'), `  - concept: Programa\n  - concept: "${PRESTACION}"\n    parent: programa_ref`));
    const path = join(work, copy);

    const listed = core.listScopeElements(path);
    if (!listed.ok) {
      check('LC: scope elements list', false, listed.code);
    } else {
      const programas = listed.elements.filter((e) => e.concept === 'Programa');
      const prestaciones = listed.elements.filter((e) => e.concept === PRESTACION);
      check('LC: 5 Programa element nodes are listed', programas.length === 5, `${programas.length}`);
      check('LC: 6 Prestaciones de Servicios are listed', prestaciones.length === 6, `${prestaciones.length}`);

      let resolved = 0;
      const failures = [];
      const prices = [];
      const rootRate = [];
      for (const pr of prestaciones) {
        const r = core.loadElementChain(path, { concept: PRESTACION, slug: pr.slug });
        if (!r.ok) { failures.push(r.code); continue; }
        const [folder, programa, prestacion] = [r.loaded.nodes[0], r.loaded.nodes[1], r.loaded.nodes.at(-1)];
        const ref = String(prestacion.values.programa_ref ?? '');
        const parentTitle = programas.find((p) => p.slug === programa.id.split('/').pop())?.title;
        if (r.loaded.nodes.length === 3 && programa.kind === 'element:Programa' && ref === `[[${parentTitle}]]` && folder.id === '') resolved++;
        const price = core.resolve(r.loaded, 'precio_hora_tutoria', 'none');
        if (price.ok) { prices.push(price.present ? price.value : null); allResolutionsEl.push(price); rootRate.push(price.explain.notInherited.length); }
      }
      check('LC: 6/6 Prestaciones resolve their Programa by programa_ref', resolved === 6, `${resolved}/6${failures.length ? ` (error codes: ${[...new Set(failures)].join(', ')})` : ''}`);
      const present = prices.filter((x) => x !== null);
      console.log(`      precio_hora_tutoria (none): present in ${present.length}/${prices.length} Prestaciones, ${new Set(present).size} distinct value(s)`);
      check('LC: precio_hora_tutoria resolves with none from the Prestacion itself in 6/6', present.length === 6, `${present.length}/6`);
      finding(`LC: the six Prestaciones carry precio_hora_tutoria ${present.length === 6 && new Set(present).size === 1 ? 'with one single value' : `with ${new Set(present).size} distinct values`}; under strategy none each keeps its own, nothing is inherited`);
      check('LC: every Prestacion loads its element chain without a loader error', failures.length === 0, [...new Set(failures)].join(', '));

      // Tutores are not scopes (unlisted concept): asking for one is a structured error, not a guess
      const bogus = core.loadElementChain(path, { concept: 'Tutor', slug: 'x' });
      check('LC: an unlisted concept (Tutor) is UNKNOWN_ELEMENT', !bogus.ok && bogus.code === 'UNKNOWN_ELEMENT', bogus.ok ? 'ok' : bogus.code);
    }
    rmSync(work, { recursive: true, force: true });
  }

  check('explain: every element resolution round-trips through JSON (deep equal)', allResolutionsEl.every((r) => sameJsonEl(JSON.parse(JSON.stringify(r)), r)), `${allResolutionsEl.length} resolutions`);
  for (const s of sources) {
    const after = s.hash();
    check(`source unchanged afterwards: ${s.label}`, after.digest === s.before.digest && after.count === s.before.count, `${after.count} file(s)`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed, ${findings.length} findings`);
  process.exit(failed.length === 0 ? 0 : 1);
}

const allResolutionsEl = [];
const sameJsonEl = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const floorDocEl = { label: 'video-script', path: FLOOR_DOC };
if (elementsMode) await runElements();

// ---------------------------------------------------------------- copy + adapt

console.log(`source: ${source}`);
const before = hashTree(source);
console.log(`source tree: ${before.count} files, sha256 ${before.digest.slice(0, 16)}`);
const work = mkdtempSync(join(tmpdir(), 'scope-golden-'));
cpSync(source, work, { recursive: true });
console.log(`working copy: ${work}`);

if (!existsSync(join(work, 'domaiNN_NN.md'))) write(work, 'domaiNN_NN.md', '---\ntitle: video_NN\n---\n# video_NN\n');

// ---- draft_scene_visuals: one definition, per-series fills (computed from the two existing copies)

const DOC = (s) => `series/${s}/procedure/draft_scene_visuals_procedures_NN.md`;
const NAME_NOISE = [
  [/Villabotijos Today|iNNteresante/g, '{{series_name}}'],
  [/VillabotijosToday|INNteresante/g, '{{series_doc}}'],
  [/villabotijos-today|innteresante/g, '{{series_slug}}'],
  [/\bCeledonio\b|\bLucas\b/g, '{{presenter}}'],
];
const BANNER = '> This is an **iNNfo document**';

/** Frontmatter and banner dropped, blank runs collapsed; series/presenter names to tokens only when `names`. */
function stripNoise(text, names = false) {
  const lines = text
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .split('\n')
    .filter((l) => !l.startsWith(BANNER))
    .map((l) => (names ? NAME_NOISE.reduce((acc, [re, tok]) => acc.replace(re, tok), l) : l).trimEnd());
  return lines.join('\n').replace(/\n{2,}/g, '\n').trim();
}

/** Naming-noise normalization used by every comparison below. */
const normalize = (text) => stripNoise(text, true);

/** Longest-common-subsequence line diff -> alternating common lines and change hunks. */
function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  const push = (kind, a1, b1) => {
    const last = ops[ops.length - 1];
    if (kind === 'common') ops.push({ kind, line: a1 });
    else if (last && last.kind === 'change') {
      if (a1 !== null) last.a.push(a1);
      if (b1 !== null) last.b.push(b1);
    } else ops.push({ kind: 'change', a: a1 === null ? [] : [a1], b: b1 === null ? [] : [b1] });
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { push('common', a[i]); i++; j++; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { push('change', null, b[j]); j++; }
    else { push('change', a[i], null); i++; }
  }
  return ops;
}

const textA = read(work, DOC('innteresante'));
const textB = read(work, DOC('villabotijos-today'));
const normA = normalize(textA).split('\n');
const normB = normalize(textB).split('\n');
const ops = diffLines(normA, normB);
const rawLines = (x) => stripNoise(x).split(String.fromCharCode(10));
const rawHunks = diffLines(rawLines(textA), rawLines(textB)).filter((o) => o.kind === 'change');
const hunks = ops.filter((o) => o.kind === 'change');
const slotNames = [];
const fills = { innteresante: {}, 'villabotijos-today': {} };
const baseLines = [];
let hunkNo = 0;
for (const op of ops) {
  if (op.kind === 'common') { baseLines.push(op.line); continue; }
  hunkNo++;
  const name = `hunk_${String(hunkNo).padStart(2, '0')}`;
  slotNames.push(name);
  baseLines.push(`{{slot:${name}}}`);
  fills.innteresante[name] = op.a.join('\n');
  fills['villabotijos-today'][name] = op.b.join('\n');
}
const sharedLines = ops.filter((o) => o.kind === 'common').length;
const changedA = hunks.reduce((n, h) => n + h.a.length, 0);
const changedB = hunks.reduce((n, h) => n + h.b.length, 0);
const residual = hunks.reduce((n, h) => n + Math.max(h.a.length, h.b.length), 0);

write(
  work,
  'procedures/draft-scene-visuals_procedures_NN.md',
  `---\nlevel: 3\n${parentSpec('procedures_V_0-1-0')}knowledge_version: "V_0-1-0"\ntitle: "Draft Scene Visuals"\nslots:\n${slotNames.map((n) => `  - { name: ${n}, kind: value, required: true }`).join('\n')}\n---\n\n${baseLines.join('\n')}\n`,
);

// ---- series markers, episode markers

const values = {};
for (const series of SERIES) {
  values[series] = seriesValues(work, series);
  const v = values[series];
  const fillYaml = Object.entries(fills[series]).map(([k, t]) => `    ${k}: ${JSON.stringify(t)}`).join('\n');
  const fields = [`music:: ${v.music}`, v.volume === null ? null : `music_volume:: ${v.volume}`, v.transition ? `transition:: ${v.transition}` : null, `voice_id:: ${v.voice}`].filter(Boolean).join('\n');
  write(work, `series/${series}/${series}_scope_NN.md`, `---\nlevel: 3\n${parentSpec('series_V_0-1-0')}title: "${series}"\nscope: true\nfills:\n  draft-scene-visuals:\n${fillYaml}\n---\n\n# NN Series\n\n## NN Series: ${series}\n${fields}\n`);
  for (const ep of episodesOf(work, series)) {
    const p = join(work, ep.doc);
    const t = readFileSync(p, 'utf-8');
    const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) throw new Error(`episode ${ep.doc} has no frontmatter`);
    writeFileSync(p, t.replace(m[0], `---\n${m[1]}\nscope: true\n---`), 'utf-8');
  }
}

// ---------------------------------------------------------------- assertions

const floorDoc = { label: 'video-script', path: FLOOR_DOC };
function load(path) {
  const found = core.findScopeChain(path);
  if (!found.ok) throw new Error(`no chain for ${path}: ${found.code}`);
  const base = core.loadChain(found.chain, { floorDoc });
  if (!base.ok) throw new Error(`${base.code}: ${base.detail}`);
  const { loaded, diagnostics } = core.loadScopeProcedures(found.chain, base.loaded);
  return { chain: found.chain, loaded, diagnostics };
}
const one = (loaded, key, strategy = 'override') => {
  const r = core.resolve(loaded, key, strategy);
  if (!r.ok) throw new Error(`${key}: ${r.code}`);
  return r;
};
const sameJson = (x, y) => JSON.stringify(x) === JSON.stringify(y);

const sample = { innteresante: 'bosco-verticale', 'villabotijos-today': 'boa-constrictor-suelta' };
const allResolutions = [];
for (const series of SERIES) {
  const ep = episodesOf(work, series).find((e) => e.slug === sample[series]);
  if (!ep) { check(`episode ${sample[series]} exists in ${series}`, false); continue; }
  const { chain, loaded, diagnostics } = load(join(work, ep.doc));
  const ids = chain.links.map((l) => l.dir);
  const want = ['', `series/${series}`, `series/${series}/assets/${ep.slug}`];
  check(`${series}: chain for an episode is [root, series, episode] (outermost first)`, sameJson(ids, want), JSON.stringify(ids));
  check(`${series}: chain is not cut and the root is the working copy`, chain.cutAt === null && chain.root === work);
  check(`${series}: loaders raise no diagnostic`, diagnostics.length === 0, JSON.stringify(diagnostics));

  const music = one(loaded, 'music');
  const volume = one(loaded, 'music_volume');
  const voice = one(loaded, 'voice_id');
  allResolutions.push(music, volume, voice, one(loaded, 'transition'), one(loaded, 'absent_key'));
  check(`${series}: music resolves to ${EXPECTED_MUSIC[series]}`, baseName(music.value) === EXPECTED_MUSIC[series], `got ${music.value}`);
  check(`${series}: music is supplied by the series marker`, music.explain.winner?.scope === `series/${series}`, JSON.stringify(music.explain.winner));
  const v = values[series];
  check(`${series}: music_volume equals the series source (${v.source})`, volume.value === v.volume, `got ${volume.value}, source says ${v.volume}`);
  if (series === 'villabotijos-today') check('villabotijos-today: music_volume is 0.06', volume.value === 0.06, `got ${volume.value}`);
  const blocks = Object.values(v.voiceCounts).reduce((a, b) => a + b, 0);
  check(`${series}: voice_id ${voice.value} equals the voice of every one of the ${blocks} Video blocks`, v.voiceCounts[voice.value] === blocks, JSON.stringify(v.voiceCounts));
  const transition = one(loaded, 'transition');
  check(`${series}: transition resolves (${transition.value}) from ${transition.explain.winner?.scope}`, transition.present);
}

// a series-level document sees [root, series]
{
  const found = core.findScopeChain(join(work, 'series', 'innteresante', 'script_template.md'));
  check('innteresante: a series-level document has chain [root, series]', found.ok && sameJson(found.chain.links.map((l) => l.dir), ['', 'series/innteresante']));
}

// drift between the series default and what each episode script says today (a finding, not a failure)
for (const series of SERIES) {
  const rows = [];
  for (const ep of episodesOf(work, series)) {
    const t = read(work, ep.doc);
    rows.push({ slug: ep.slug, music: baseName(fieldOf(t, 'music') ?? ''), volume: fieldOf(t, 'music_volume') });
  }
  const v = values[series];
  const musicDrift = rows.filter((r) => r.music && r.music !== baseName(v.music));
  const volumeDrift = rows.filter((r) => r.volume !== null && Number(r.volume) !== v.volume);
  console.log(`      ${series}: ${rows.length} episode scripts; music differs in ${musicDrift.length}, volume differs in ${volumeDrift.length}, volume absent in ${rows.filter((r) => r.volume === null).length}`);
  if (musicDrift.length) finding(`${series}: episode-level music differs from the series default in ${musicDrift.map((r) => `${r.slug}=${r.music}`).join(', ')}. It is declared on a scene element (first scene), not on the Video element, so the folder adapter (first element of the marker) cannot express it: element-adapter need`);
  if (volumeDrift.length) finding(`${series}: episode scripts disagree with the series default volume ${v.volume} in ${volumeDrift.length} of ${rows.length} scripts (${volumeDrift.map((r) => `${r.slug}=${r.volume}`).join(', ')})`);
}

// draft_scene_visuals composed from one definition + per-series fills
{
  const compose = (body, bindings) => body.replace(/\{\{slot:([a-z_0-9]+)\}\}/g, (_, n) => {
    const b = bindings[n];
    if (!b || typeof b.value !== 'string') throw new Error(`slot ${n} not bound to text`);
    return b.value;
  });
  const outputs = {};
  for (const series of SERIES) {
    const ep = episodesOf(work, series)[0];
    const { loaded } = load(join(work, ep.doc));
    const res = core.resolveProcedures(loaded);
    const p = res.procedures.find((x) => x.def.id === 'draft-scene-visuals');
    check(`${series}: draft-scene-visuals is selected from the single root definition`, !!p && p.def.scope === '' && p.def.doc === 'procedures/draft-scene-visuals_procedures_NN.md');
    check(`${series}: composition raises no procedure diagnostic`, res.diagnostics.length === 0, JSON.stringify(res.diagnostics.slice(0, 3)));
    check(`${series}: all ${slotNames.length} slots are bound by the series marker`, !!p && Object.values(p.bindings).length === slotNames.length && Object.values(p.bindings).every((b) => b.from.scope === `series/${series}`));
    const body = read(work, p.def.doc).replace(/^---\n[\s\S]*?\n---\n/, '');
    outputs[series] = normalize(compose(body, p.bindings));
    const original = normalize(read(work, DOC(series)));
    check(`${series}: composed text equals the existing copy modulo naming noise`, outputs[series] === original, `${outputs[series].length} vs ${original.length} chars`);
  }
  const fmKeys = (t) => [...t.match(/^---\n([\s\S]*?)\n---/)[1].matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
  const fmDiff = (k) => (textA.match(new RegExp(`^${k}: .*$`, 'm')) || [''])[0] !== (textB.match(new RegExp(`^${k}: .*$`, 'm')) || [''])[0];
  const differing = [...new Set([...fmKeys(textA), ...fmKeys(textB)])].filter(fmDiff);
  finding(`draft_scene_visuals: normalization = drop frontmatter (differs only in: ${differing.join(', ')}) and the "${BANNER}" banner line, collapse blank lines, replace series name/doc/slug and presenter (Lucas/Celedonio) by tokens`);
  finding(`draft_scene_visuals: ${normA.length} vs ${normB.length} normalized lines; ${sharedLines} shared, ${hunks.length} residual hunks (${changedA} lines in innteresante, ${changedB} in villabotijos-today, ${residual} lines to cover by slots, ${(100 * residual / Math.max(normA.length, normB.length)).toFixed(1)}% of the larger copy)`);
  finding(`draft_scene_visuals: without the name/presenter tokens the same diff has ${rawHunks.length} hunks, so ${rawHunks.length - hunks.length} hunks are pure naming noise`);
  console.log('      hunk list (A lines/B lines, first 70 chars of A | B):');
  hunks.forEach((h, i) => console.log(`        ${slotNames[i]} ${String(h.a.length).padStart(2)}/${String(h.b.length).padStart(2)}  ${(h.a[0] ?? '').slice(0, 70)} | ${(h.b[0] ?? '').slice(0, 70)}`));
}

// explain serializes for every resolution made above, union included
{
  const ep = episodesOf(work, 'innteresante')[0];
  const { loaded } = load(join(work, ep.doc));
  const union = one(loaded, 'components', 'union');
  allResolutions.push(union);
  check('explain: every resolution round-trips through JSON (deep equal)', allResolutions.every((r) => sameJson(JSON.parse(JSON.stringify(r)), r)), `${allResolutions.length} resolutions`);
  check('explain: union of the blueprint `components` keeps the floor entries', union.value.length >= 1, `${union.value.length} entries`);
}

// markers must not collide as model ids
{
  const markers = listFiles(work).filter((f) => f.endsWith('_scope_NN.md') || f.endsWith('draft-scene-visuals_procedures_NN.md'));
  check('added documents introduce no model-id collision', core.findStemCollisions(markers).length === 0, markers.join(', '));
}

// other findings the adapters could not express or the data contradicts
{
  const guardPath = join(work, 'video-guard.json');
  if (existsSync(guardPath)) {
    const guard = JSON.parse(readFileSync(guardPath, 'utf-8'));
    for (const series of SERIES) {
      const voice = values[series].voice;
      const entry = guard.voices?.[voice];
      if (!entry) finding(`${series}: voice ${voice} is not listed in video-guard.json voices`);
      else if (entry.series !== series) finding(`${series}: video-guard.json maps voice ${voice} to series "${entry.series}", but all 8 Video blocks of ${series} use it: the guard and the data disagree`);
    }
  }
  finding('voice_id is declared nowhere at series level today: it is repeated in each "## NN Video" block (element scope) and only mapped by video-guard.json; the golden hoists it into the series marker');
  const singular = SERIES.filter((s) => existsSync(join(work, 'series', s, 'procedure')));
  finding(`procedures live in "series/<s>/procedure/" (singular) in ${singular.length} of ${SERIES.length} series, while loadScopeProcedures reads "<scope>/procedures/": video adoption must rename the folder or the loader must learn the name`);
  const nnDocs = listFiles(work).filter((f) => isNNName(f) && !f.startsWith('.moves_backup/') && !f.startsWith('sources/'));
  const collisions = core.findStemCollisions(nnDocs);
  finding(`model-id collisions among ${nnDocs.length} _NN.md documents (outside sources/ and .moves_backup/): ${collisions.length} (${collisions.slice(0, 6).map((c) => c.id + ' x' + c.paths.length).join(', ')}${collisions.length > 6 ? ', ...' : ''})`);
}

// ---------------------------------------------------------------- epilogue

const after = hashTree(source);
check('source tree is byte-unchanged afterwards', after.digest === before.digest && after.count === before.count, `${after.count} files`);
if (keep) console.log(`kept working copy: ${work}`);
else rmSync(work, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} assertions passed, ${findings.length} findings`);
process.exit(failed.length === 0 ? 0 : 1);
