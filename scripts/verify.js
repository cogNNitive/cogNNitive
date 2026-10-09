#!/usr/bin/env node

/**
 * scripts/verify.js
 *
 * Deterministic workspace verification runner for cogNNitive tooling.
 * Enforces template inventory parity, scripts static type safety, orchestrator
 * line-count limits, and generated-manifest freshness.
 *
 * Verification is OFFLINE and deterministic in every mode (quality-gates spec):
 * no network, no GitHub API, no release tags. `NN_OFFLINE=1` is set for every
 * child process and the GitHub client throws when it is set. Release state
 * (pins, tags, the published manifest) is checked by the release workflow, not
 * here. `--release` is accepted for compatibility and changes nothing.
 *
 * Output is quiet: each step writes to `.verify-logs/<id>.log`; passing steps
 * print one line, failing steps print the last 60 lines. `--verbose` streams.
 * Every step runs; the run ends with a summary and exits 1 if any step failed.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { runStep } = require('./lib/verify-reporter.js');

// Ensure local node_modules/.bin is accessible on PATH for standalone node invocations
const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const pathKey = Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'PATH';
if (fs.existsSync(binDir) && !(process.env[pathKey] || '').includes(binDir)) {
  process.env[pathKey] = `${binDir}${path.delimiter}${process.env[pathKey] || ''}`;
}

function extractDeclaredBlueprints(sourceText) {
  /** @type {Set<string>} */
  const declaredBlueprints = new Set();
  const matchRegex = /-\s+name:\s+([^\s\n]+)/g;
  for (const block of ['blueprints:', 'frozen_blueprints:', 'seam_dirs:']) {
    const templatesMatch = sourceText.match(new RegExp(`(?:^|\\n)${block}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n[a-z_]+:|$)`));
    const templatesBlock = templatesMatch ? templatesMatch[1] : '';
    let match;
    while ((match = matchRegex.exec(templatesBlock)) !== null) {
      declaredBlueprints.add(match[1]);
    }
  }
  return declaredBlueprints;
}

function checkBlueprintInventory(blueprintsDir, sourceYamlPath, repoRoot = null) {
  const sourceText = fs.readFileSync(sourceYamlPath, 'utf8');
  const declaredBlueprints = extractDeclaredBlueprints(sourceText);

  let diskFolders = [];
  if (fs.existsSync(blueprintsDir)) {
    diskFolders = fs.readdirSync(blueprintsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'assets')
      .map(d => d.name);
  }

  const missing = diskFolders.filter(name => !declaredBlueprints.has(name));
  const missingPaths = [];

  if (repoRoot) {
    const { parseFocusedYaml } = require('./lib/yaml-parser.js');
    try {
      const doc = parseFocusedYaml(sourceText) || {};
      for (const s of (doc.skills || [])) {
        if (s.path && !fs.existsSync(path.join(repoRoot, s.path, 'SKILL.md'))) {
          missingPaths.push(`Skill '${s.name || s.path}' missing at ${s.path}/SKILL.md`);
        }
        for (const m of (s.mcp || [])) {
          if (m.path && !fs.existsSync(path.join(repoRoot, m.path))) {
            missingPaths.push(`Skill MCP '${m.name || m.path}' missing at ${m.path}`);
          }
        }
      }
      for (const b of (doc.blueprints || [])) {
        if (b.path && !fs.existsSync(path.join(repoRoot, b.path))) {
          missingPaths.push(`Blueprint '${b.name || b.path}' missing at ${b.path}`);
        }
      }
      for (const b of (doc.frozen_blueprints || [])) {
        if (b.path && !fs.existsSync(path.join(repoRoot, b.path))) {
          missingPaths.push(`Frozen blueprint '${b.name || b.path}' missing at ${b.path}`);
        }
      }
      for (const a of (doc.console_assets || [])) {
        if (a.file && !fs.existsSync(path.join(repoRoot, a.file))) {
          missingPaths.push(`Console asset '${a.name || a.file}' missing at ${a.file}`);
        }
      }
    } catch (err) {
      missingPaths.push(`Failed to parse source.yaml: ${err.message}`);
    }
  }

  return { ok: missing.length === 0 && missingPaths.length === 0, missing, missingPaths, diskFolders };
}

/**
 * Scans git-tracked docs source files under `docs/innfo/**` and
 * `docs/skills/**` (`.md`/`.txt`) at `ref` for hand-typed facts that must
 * instead be derived: a literal MCP tool count, or a registered skill name
 * paired with a literal version string (spec docs-derived-facts,
 * "CI Drift Guard").
 *
 * Reuses the canonical ESM `findHandTypedFacts` from `scripts/lib/docs-facts.mjs`
 * — never duplicated here (this codebase has already been bitten once by two
 * copies of the same parser drifting apart) — via a one-shot Node subprocess,
 * since `verify.js` itself is CommonJS and cannot `require()` an ESM module
 * synchronously. The bridge script is written to a throwaway OS-tmp file
 * (never a tracked repo file) and removed once it has run.
 *
 * @param {string} repoRoot - target repo whose git-tracked docs are scanned
 *   (its own working tree is never read — only `git show <ref>:<path>`).
 * @param {string} ref - git ref to scan (design D5: never the working tree —
 *   CI runs `build:docs` before `verify.js`, so a working-tree scan could
 *   never see drift that write mode already rewrote).
 * @param {{ execFileSync?: Function, scriptsDir?: string }} [deps] - injectable
 *   for tests. `scriptsDir` is where `lib/docs-facts.mjs` and
 *   `manifest/generate-manifest.js` are loaded from — defaults to this file's
 *   own directory, deliberately independent of `repoRoot` so a test fixture
 *   repo can be scanned using the real, unduplicated generator code.
 * @returns {{ ok: boolean, output: string }}
 */
function checkHandTypedFactsAtRef(repoRoot, ref, deps = {}) {
  const exec = deps.execFileSync || execFileSync;
  const scriptsDir = deps.scriptsDir || __dirname;
  const libHref = pathToFileURL(path.join(scriptsDir, 'lib', 'docs-facts.mjs')).href;
  const generateManifestPath = path.join(scriptsDir, 'manifest', 'generate-manifest.js');

  const bridgeSource = [
    `import { findHandTypedFacts } from ${JSON.stringify(libHref)};`,
    "import { execFileSync } from 'node:child_process';",
    "import { createRequire } from 'node:module';",
    '',
    'const require = createRequire(import.meta.url);',
    `const repoRoot = ${JSON.stringify(repoRoot)};`,
    `const ref = ${JSON.stringify(ref)};`,
    '',
    'function git(args) {',
    "  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf-8' });",
    '}',
    '',
    "const listing = git(['ls-tree', '-r', '--name-only', ref, '--', 'docs/innfo', 'docs/skills']);",
    "const paths = listing.split(/\\r?\\n/).filter((p) => p && /\\.(md|txt)$/.test(p));",
    "const files = paths.map((p) => ({ path: p, content: git(['show', ref + ':' + p]) }));",
    '',
    `const { parseSourceYaml } = require(${JSON.stringify(generateManifestPath)});`,
    'let skillNames = [];',
    'try {',
    "  const manifestContent = git(['show', ref + ':manifest/source.yaml']);",
    '  skillNames = parseSourceYaml(manifestContent).skills.map((s) => s.name);',
    '} catch (err) {',
    '  // manifest missing at ref: the tool-count rule still runs, the skill-version rule is skipped',
    '}',
    '',
    'const violations = findHandTypedFacts(files, { skillNames });',
    'if (violations.length > 0) {',
    '  for (const v of violations) {',
    "    console.log('FAIL: hand-typed ' + v.rule + ' at ' + v.path + ':' + v.line + ': ' + v.excerpt);",
    '  }',
    '  process.exit(1);',
    '}',
    "console.log('OK: no hand-typed docs facts found across ' + files.length + ' file(s) at ' + ref);",
    'process.exit(0);',
    '',
  ].join('\n');

  const tmpFile = path.join(os.tmpdir(), `cognnitive-hand-typed-facts-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, bridgeSource, 'utf-8');
  try {
    const output = exec(process.execPath, [tmpFile], { encoding: 'utf-8' });
    return { ok: true, output };
  } catch (err) {
    return { ok: false, output: (err.stdout || '') + (err.stderr || err.message || '') };
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

/**
 * Step 7e: Docs-Derived Facts Drift Guard (spec docs-derived-facts,
 * "CI Drift Guard"). Runs both generated-region/twin freshness checks and the
 * hand-typed-fact repo scan, all against a committed git ref rather than the
 * working tree (design D5) — CI's `build:docs` step already ran write mode
 * before `verify.js` runs, so a working-tree check could never see drift.
 *
 * @param {string} repoRoot - target repo to check (see `checkHandTypedFactsAtRef`).
 * @param {string} ref
 * @param {{ execFileSync?: Function, scriptsDir?: string }} [deps] - injectable
 *   for tests; see `checkHandTypedFactsAtRef` for `scriptsDir`.
 * @returns {{ ok: boolean, failures: string[] }}
 */
function checkDocsFactsDriftAtRef(repoRoot, ref, deps = {}) {
  const exec = deps.execFileSync || execFileSync;
  const scriptsDir = deps.scriptsDir || __dirname;
  const failures = [];

  const generatorChecks = [
    ['generate-docs-facts.mjs', 'MCP tool facts / skills catalog regions'],
    ['generate-about-twin.mjs', 'about.md twin'],
  ];

  for (const [scriptName, label] of generatorChecks) {
    try {
      exec(process.execPath, [path.join(scriptsDir, scriptName), '--check', '--against', ref], {
        cwd: repoRoot,
        encoding: 'utf-8',
      });
    } catch (err) {
      failures.push(
        `${label} (${scriptName} --check --against ${ref}) is stale:\n${(err.stdout || '') + (err.stderr || err.message || '')}`,
      );
    }
  }

  const scan = checkHandTypedFactsAtRef(repoRoot, ref, deps);
  if (!scan.ok) {
    failures.push(`Hand-typed docs facts reintroduced at ${ref}:\n${scan.output}`);
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Collects every self-contained Node test suite under `scripts/` and `skills/`
 * by shape (`*.test.js` / `*.test.mjs`), instead of an enumerated allowlist.
 *
 * The allowlist this replaces drifted twice: the `actioNN/` -> `skills/`
 * consolidation left skill suites ungated through a green CI run, and eight
 * further suites (export-console, guard-text-encoding, git-visible,
 * mcp-config-adapter, skills-manager, template-catalog, upgrade-check,
 * backup-workspace) were added afterwards and never wired in. Discovering them
 * by filename means a new suite is gated the moment it exists.
 *
 * Suites that do NOT match the pattern stay wired explicitly below
 * (`nn-sources/test/run.js`, `specs/scripts/test-vocabulary.js`), as do the
 * `--check` drift guards, whose ordering is load-bearing.
 *
 * @param {string} dir - Absolute directory to walk.
 * @param {string[]} [found] - Accumulator.
 * @returns {string[]} Repo-relative POSIX paths, sorted for a stable run order.
 */
function collectTestSuites(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // skills/nn-sources ships its own dependency tree; never walk into it.
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTestSuites(full, found);
    else if (/\.test\.(js|mjs)$/.test(entry.name)) found.push(full);
  }
  return found.sort();
}

const OFFLINE_GUARD = path.join(__dirname, 'lib', 'offline-guard.js').split(path.sep).join('/');

/**
 * Environment for every child process: offline mode is enforced, never optional.
 * `NN_OFFLINE=1` plus a `--require` preload that refuses non-loopback connections
 * at the net/tls/dns/fetch level, so even a suite that bypasses the GitHub client
 * (or stubs the wrong transport) fails closed. Existing NODE_OPTIONS are kept.
 * @param {NodeJS.ProcessEnv} [base]
 * @returns {NodeJS.ProcessEnv}
 */
function childEnv(base = process.env) {
  /** @type {NodeJS.ProcessEnv} */
  const childEnvironment = { ...base, NN_OFFLINE: '1' };
  const options = childEnvironment.NODE_OPTIONS || '';
  if (!options.includes(OFFLINE_GUARD)) {
    childEnvironment.NODE_OPTIONS = `${options} --require "${OFFLINE_GUARD}"`.trim();
  }
  return childEnvironment;
}

/**
 * Wraps an in-process check so its console output lands in the step's log
 * instead of the console.
 * @param {() => { ok: boolean, lines: string[] }} check
 * @returns {() => { ok: boolean, output: string }}
 */
function inline(check) {
  return () => {
    const { ok, lines } = check();
    return { ok, output: lines.join('\n') + '\n' };
  };
}

/**
 * Builds the ordered list of verification steps. Pure: nothing runs here.
 * @param {string} repoRoot
 * @param {{ release?: boolean }} [_options] - accepted for CLI compatibility;
 *   verification does not depend on release state, so it changes nothing.
 * @returns {Array<{ id: string, desc: string, cmd?: string, args?: string[], run?: () => { ok: boolean, output?: string } }>}
 */
function buildSteps(repoRoot, _options = {}) {
  const node = (id, desc, ...args) => ({ id, desc, cmd: process.execPath, args });
  const steps = [];

  // 0b. Every `*.test.js` / `*.test.mjs` suite under scripts/, skills/, test/ and the skills
  //     embedded in bluepriNNt packages,
  //     discovered by shape rather than enumerated (the allowlist this replaced
  //     drifted twice). Self-contained, so they run first.
  const suites = [
    ...collectTestSuites(path.join(repoRoot, 'scripts')),
    ...collectTestSuites(path.join(repoRoot, 'skills')),
    ...collectTestSuites(path.join(repoRoot, 'test')),
    // Skills embedded in a bluepriNNt (e.g. video/skills/nn-video-script). Vitest suites
    // are `*.spec.ts` under iNNfo/packages, so this tree is never double-run.
    ...collectTestSuites(path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts')),
  ];
  for (const suite of suites) {
    const rel = path.relative(repoRoot, suite).split(path.sep).join('/');
    steps.push(node('test-' + rel.replace(/[^A-Za-z0-9]+/g, '-'), 'Test ' + rel, rel));
  }

  // 0c. Suites whose filenames do not match the `*.test.*` shape. Keep explicit.
  steps.push(node('test-nn-sources', 'Test nn-sources Skill Suite', 'skills/nn-sources/test/run.js'));
  steps.push(node('test-vocabulary', 'Test Canonical Vocabulary Guard', 'iNNfo/specs/scripts/test-vocabulary.js'));
  steps.push(node('vocabulary-doc', 'Check Canonical Vocabulary Doc Fresh', 'scripts/generate-vocabulary-doc.mjs', '--check'));

  // 1. Template Inventory Guard: every template folder is declared in manifest/source.yaml.
  steps.push({
    id: 'blueprint-inventory',
    desc: 'Template Inventory Guard',
    run: inline(() => {
      const blueprintsDir = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts');
      const sourceYamlPath = path.join(repoRoot, 'manifest', 'source.yaml');
      if (!fs.existsSync(blueprintsDir) || !fs.existsSync(sourceYamlPath)) {
        return { ok: true, lines: ['skipped: blueprints dir or source.yaml missing'] };
      }
      const { ok, missing, missingPaths, diskFolders } = checkBlueprintInventory(blueprintsDir, sourceYamlPath, repoRoot);
      const errLines = [];
      if (missing && missing.length > 0) {
        errLines.push(`Folders exist in specs/bluepriNNts/ but are missing from manifest/source.yaml: ${missing.join(', ')}`);
      }
      if (missingPaths && missingPaths.length > 0) {
        errLines.push(...missingPaths.map((p) => `Missing source path: ${p}`));
      }
      return ok
        ? { ok, lines: [`all ${diskFolders.length} template folders and declared source paths exist.`] }
        : { ok: false, lines: errLines };
    }),
  });

  // 1b. Console Shell Integrity Guard: shells match needs registry & pins.
  steps.push({
    id: 'console-shell',
    desc: 'Console Shell Integrity Guard',
    run: inline(() => {
      const { checkConsoleShellIntegrity } = require('./lib/console-shell-guard.js');
      const res = checkConsoleShellIntegrity(repoRoot);
      return res.ok
        ? { ok: true, lines: [`all ${res.shells.length} shells adhere to contract.`] }
        : { ok: false, lines: res.errors.map((e) => `  - ${e}`) };
    }),
  });

  // 2. Orchestrator Line-Count Guard: strictly < 200 physical lines per orchestrator.
  steps.push({
    id: 'line-count',
    desc: 'Orchestrator Line-Count Guard',
    run: inline(() => {
      const ORCHESTRATORS = [
        'scripts/manifest/validate-manifest.js',
        'scripts/skills-manager.js',
        'scripts/release/run-release.js',
        'skills/nn-sources/scripts/scanner.js',
        'skills/nn-sources/scripts/provenance.js',
      ];
      const MAX_LINES = 200;
      const lines = [];
      let ok = true;
      for (const relPath of ORCHESTRATORS) {
        const fullPath = path.join(repoRoot, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
        if (lineCount >= MAX_LINES) {
          ok = false;
          lines.push(`${relPath} has ${lineCount} lines (limit: strictly < ${MAX_LINES}).`);
        } else {
          lines.push(`${relPath} (${lineCount} lines < ${MAX_LINES}).`);
        }
      }
      return { ok, lines };
    }),
  });

  // 4. Script static type checking.
  steps.push(node('typecheck-scripts', 'Typecheck Scripts', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.scripts.json'));

  // 5. Preflight Primitives Drift Guard (committed bundle matches innfo-core source).
  steps.push(node('preflight-primitives', 'Check Preflight Primitives Bundle Fresh', 'scripts/build-preflight-primitives.mjs', '--check'));
  // 5b. nn-skills-lifecycle bundled skills-manager drift guard.
  steps.push(node('skills-manager-bundle', 'Check Skills Manager Bundle Fresh', 'scripts/build-skills-manager-bundle.mjs', '--check'));
  // 5b-bis. Shared rules rendered into the end-user skills match their source.
  steps.push(node('skill-shared-rules', 'Check Skill Shared Rules Fresh', 'scripts/build-skill-shared-rules.mjs', '--check'));
  // 5c. Distributed skills are self-contained: referenced `node scripts/<file>` exists in the skill folder.
  steps.push({
    id: 'skill-script-refs',
    desc: 'Distributed Skill Script References Guard',
    run: inline(() => {
      const { checkSkillScriptReferences } = require('./lib/skill-script-refs.js');
      const res = checkSkillScriptReferences(repoRoot);
      return res.ok
        ? { ok: true, lines: [`${res.checked} script reference(s) resolve inside their skill folders.`] }
        : { ok: false, lines: res.errors.map((e) => `  - ${e}`) };
    }),
  });
  // 7. Blueprint Catalog Drift Guard.
  steps.push(node('blueprint-catalog', 'Check Blueprint Catalog Fresh', 'scripts/blueprint-catalog.mjs', '--check'));
  // 7b. nn-sources core mirror drift guard (render of innfo-core trannsform primitives).
  steps.push(node('core-mirror', 'Check Trannsform Core Mirror Fresh', 'scripts/build-trannsform-core-mirror.mjs', '--check'));
  // 7b-bis. Console payload mirror drift guard.
  steps.push(node('console-payload', 'Check Console Payload Mirror Fresh', 'scripts/build-console-payload.mjs', '--check'));
  // 7b-ter. nn-video-script parser mirror drift guard (render of innfo-video-parser).
  steps.push(node('video-parser-mirror', 'Check Video Parser Mirror Fresh', 'scripts/build-video-parser-mirror.mjs', '--check'));
  // 7c. Samples SSOT Drift Guard.
  steps.push(node('samples-parity', 'Check Samples Parity with _samples_nn', 'scripts/sync-samples.mjs', '--check'));
  // 7c-bis. Samples version coherence: every sample tracks a current shipped blueprint_version.
  steps.push(node('samples-version', 'Check Samples Version Coherence', 'scripts/check-samples-version.mjs'));
  // 7d. Version SSOT Drift Guard (SHIPPED_BLUEPRINT_VERSIONS, manifest/source.yaml vs specs and SKILL.md).
  steps.push(node('version-parity', 'Check Version Parity with Specs and Skills', 'scripts/sync-versions.mjs', '--check'));

  // 7e. Docs-Derived Facts Drift Guard, checked against HEAD, never the working tree (design D5).
  steps.push({
    id: 'docs-facts-drift',
    desc: 'Docs-Derived Facts Drift Guard (against HEAD)',
    run: inline(() => {
      const res = checkDocsFactsDriftAtRef(repoRoot, 'HEAD');
      return res.ok
        ? { ok: true, lines: ['no drift detected against HEAD.'] }
        : { ok: false, lines: res.failures.map((f) => `  - ${f}`) };
    }),
  });

  // 12-15. Repository guards.
  steps.push(node('template-immutability', 'Template Immutability Guard', 'scripts/guard-template-immutability.js'));
  steps.push(node('console-shells-fresh', 'Check Generated Console Shells Fresh', 'scripts/build-console-shells.mjs', '--check'));
  steps.push(node('text-encoding', 'Guard Tracked Text Encoding', 'scripts/guard-text-encoding.js'));
  steps.push(node('legacy-ledger', 'Legacy Ledger & Quarantine Guard', 'scripts/lib/legacy-ledger-guard.js'));
  steps.push(node('brand-purge', 'Retired Product Name Guard', 'scripts/lib/brand-purge-guard.js'));
  steps.push(node('legacy-write', 'Legacy Write Guard', 'scripts/lib/legacy-write-guard.js'));
  steps.push(node('nn-name-regex', 'NN Name Regex Guard', 'scripts/lib/nn-name-regex-guard.js'));
  steps.push(node('nn-name-invariant', 'NN Name Invariant Guard', 'scripts/lib/nn-name-invariant-guard.js'));
  steps.push(node('lineage-drift', 'Lineage Drift Guard', 'scripts/lib/lineage-drift-guard.js'));

  return steps;
}

/**
 * Runs every step (never stops at the first failure), then prints a summary.
 * @param {ReturnType<typeof buildSteps>} steps
 * @param {{ logDir: string, verbose?: boolean, ci?: boolean, cwd?: string, env?: NodeJS.ProcessEnv, write?: (l: string) => void }} options
 * @returns {{ ok: boolean, results: any[], failed: any[] }}
 */
function runSteps(steps, options) {
  const write = options.write || ((line) => console.log(line));
  const results = steps.map((step) => runStep(step, { ...options, write }));
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    write(`\n❌ ${failed.length} of ${results.length} step(s) failed:`);
    failed.forEach((f) => write(`  - ${f.desc}${f.logPath ? ` → ${f.logPath}` : ''}`));
  }
  return { ok: failed.length === 0, results, failed };
}

/**
 * @param {{ release?: boolean, verbose?: boolean }} [options]
 * @returns {boolean} true when every step passed
 */
function runVerification(options = {}) {
  const repoRoot = path.join(__dirname, '..');
  // In-process checks (and the children they spawn) must be offline too.
  const previousOffline = process.env.NN_OFFLINE;
  process.env.NN_OFFLINE = '1';
  console.log('🔍 [cogNNitive Verify] Running workspace verification (offline)...');

  const steps = buildSteps(repoRoot, options);
  console.log(`▶ ${steps.length} steps.`);
  let ok;
  try {
    ({ ok } = runSteps(steps, {
      logDir: path.join(repoRoot, '.verify-logs'),
      verbose: options.verbose === true,
      ci: Boolean(process.env.GITHUB_ACTIONS),
      cwd: repoRoot,
      env: childEnv(),
    }));
  } finally {
    // Do not leak offline mode into a caller (check-integrity runs more after us).
    if (previousOffline === undefined) delete process.env.NN_OFFLINE;
    else process.env.NN_OFFLINE = previousOffline;
  }
  if (ok) console.log('\n✅ [cogNNitive Verify] All deterministic pre-checks passed.');
  return ok;
}

if (require.main === module) {
  const ok = runVerification({
    release: process.argv.includes('--release'),
    verbose: process.argv.includes('--verbose'),
  });
  process.exit(ok ? 0 : 1);
}

module.exports = {
  checkBlueprintInventory,
  runVerification,
  buildSteps,
  runSteps,
  childEnv,
  extractDeclaredBlueprints,
  checkHandTypedFactsAtRef,
  checkDocsFactsDriftAtRef,
};
