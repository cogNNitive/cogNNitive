#!/usr/bin/env node

/**
 * scripts/generate-docs-facts.mjs
 *
 * Derives one generated region from its canonical source (design
 * D2/D3/D4/D5):
 *   - `mcp-tools` in skills/nn-innfo/SKILL.md, from the built nn-mcp tool
 *     registry, so the skill ships an accurate tool inventory instead of a
 *     hand-typed count.
 *
 * CLI contract:
 *   node scripts/generate-docs-facts.mjs [--check] [--against <git-ref>]
 *     (no flags)            write mode: regenerate and write the region
 *     --check               compare the render against its on-disk file, do not write
 *     --check --against X   compare the render against `git show X:<path>` instead
 *                            of the working tree (used by CI, which runs write mode
 *                            in build:docs first — see design D5)
 *
 *     exit 0  the job wrote (or --check: the target is up to date)
 *     exit 1  --check: the target differs from its generated render
 *             (and the job did not hit an input failure)
 *     exit 2  input failure: missing built dist, missing region markers, or a
 *             bad --against ref
 *
 * The render is a pure function of its canonical source: no timestamp, no
 * generator version, no run id. Regeneration with no upstream change is
 * byte-identical (design "Regeneration is deterministic").
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  replaceRegion,
  renderMcpToolsRegion,
  normalizeOutput,
} from './lib/docs-facts.mjs';

const MCP_TOOLS_REGION = 'mcp-tools';
const DIST_RELATIVE_PATH = path.join('iNNfo', 'packages', 'nn-mcp', 'dist', 'server.js');
// The mcp-tools region is rendered into the nn-innfo skill's own SKILL.md
// (design D4), so the skill ships an accurate tool inventory instead of a
// hand-typed count.
const MCP_TARGET_RELATIVE_PATHS = [
  path.join('skills', 'nn-innfo', 'SKILL.md'),
];

/**
 * @param {string[]} argv
 * @returns {{ check: boolean, against: string | null }}
 */
function parseArgs(argv) {
  let check = false;
  let against = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') check = true;
    else if (arg === '--against') against = argv[++i] ?? null;
    else if (arg.startsWith('--against=')) against = arg.slice('--against='.length);
  }
  return { check, against };
}

/**
 * Reads the tool registry from the built nn-mcp dist. Imported as an
 * absolute file URL (Windows-safe) so the same code works from any cwd.
 * @param {string} distPath
 * @returns {Promise<Array<{ name: string, description: string }>>}
 */
async function loadToolDefinitions(distPath) {
  const mod = await import(pathToFileURL(distPath).href);
  return mod.toolDefinitions.map((tool) => ({ name: tool.name, description: tool.description }));
}

/**
 * Reads the current content of the target doc, either from the working tree
 * or from a committed git ref (design D5's `--against` seam).
 * @param {string} cwd
 * @param {string} targetPath
 * @param {string | null} against
 * @param {(cmd: string, args: string[], opts: object) => string} execFile - injectable for tests
 * @returns {{ content: string } | { error: string }}
 */
function readCurrentContent(cwd, targetPath, against, execFile) {
  if (against) {
    try {
      const relPosix = path.relative(cwd, targetPath).split(path.sep).join('/');
      const content = execFile('git', ['show', `${against}:${relPosix}`], { cwd, encoding: 'utf-8' });
      return { content };
    } catch (err) {
      return { error: `could not read ${targetPath} at git ref '${against}': ${err.message}` };
    }
  }

  if (!fs.existsSync(targetPath)) {
    return { error: `target file not found: ${targetPath}` };
  }
  return { content: fs.readFileSync(targetPath, 'utf-8') };
}

/**
 * Writes (or, in `--check` mode, verifies) `rendered` at `targetPath`,
 * sharing the exact write/check/log contract across both regions this CLI
 * owns.
 * @param {{ targetPath: string, currentContent: string, rendered: string, check: boolean, log: Function, logError: Function, describeCount: string }} params
 * @returns {number} 0 ok, 1 drift
 */
function writeOrCheck({ targetPath, currentContent, rendered, check, log, logError, describeCount }) {
  if (check) {
    if (rendered === normalizeOutput(currentContent)) {
      log(`OK: ${targetPath} is up to date (${describeCount})`);
      return 0;
    }
    logError(`FAIL: --check: ${targetPath} differs from the generated render (${describeCount} expected)`);
    return 1;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, rendered, 'utf-8');
  log(`OK: wrote ${targetPath} (${describeCount})`);
  return 0;
}

/**
 * Job: derive the `mcp-tools` region from the built nn-mcp registry
 * (design D3/D4/D5).
 * @returns {Promise<number>} exit code for this job alone
 */
async function runMcpToolsJob(cwd, check, against, execFile, log, logError) {
  const distPath = path.join(cwd, DIST_RELATIVE_PATH);
  if (!fs.existsSync(distPath)) {
    logError(`FAIL: nn-mcp build artifact not found at: ${distPath}. Build it first (npm --workspace=@cognnitive/nn-mcp run build).`);
    return 2;
  }

  let tools;
  try {
    tools = await loadToolDefinitions(distPath);
  } catch (err) {
    logError(`FAIL: could not import ${distPath}: ${err.message}`);
    return 2;
  }

  const body = renderMcpToolsRegion(tools);
  let exitCode = 0;

  for (const relPath of MCP_TARGET_RELATIVE_PATHS) {
    const targetPath = path.join(cwd, relPath);
    const current = readCurrentContent(cwd, targetPath, against, execFile);
    if ('error' in current) {
      logError(`FAIL: ${current.error}`);
      exitCode = Math.max(exitCode, 2);
      continue;
    }

    let rendered;
    try {
      rendered = normalizeOutput(replaceRegion(current.content, MCP_TOOLS_REGION, body));
    } catch (err) {
      logError(`FAIL: ${err.message} in ${against ? `${targetPath} at ref '${against}'` : targetPath}`);
      exitCode = Math.max(exitCode, 2);
      continue;
    }

    exitCode = Math.max(
      exitCode,
      writeOrCheck({
        targetPath,
        currentContent: current.content,
        rendered,
        check,
        log,
        logError,
        describeCount: `${tools.length} tools`,
      }),
    );
  }

  return exitCode;
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, log?: (msg: string) => void, logError?: (msg: string) => void, execFile?: Function }} [options]
 * @returns {Promise<number>} the job's exit code (2 > 1 > 0).
 */
export async function run(argv, options = {}) {
  const {
    cwd = process.cwd(),
    log = console.log,
    logError = console.error,
    execFile = execFileSync,
  } = options;

  const { check, against } = parseArgs(argv);

  if (against && !check) {
    logError('FAIL: --against requires --check');
    return 2;
  }

  return runMcpToolsJob(cwd, check, against, execFile, log, logError);
}

async function main() {
  const exitCode = await run(process.argv.slice(2));
  process.exit(exitCode);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
