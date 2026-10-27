#!/usr/bin/env node

/**
 * scripts/check-openspec-deltas.mjs
 *
 * Mirror of the delta-spec rules that `openspec validate` enforces, run offline
 * and deterministically because openspec is a global CLI and NOT a CI gate: an
 * invalid delta can be committed and the failure only surfaces when a
 * maintainer happens to run `openspec validate` by hand.
 *
 * Upstream source of truth, @fission-ai/openspec@1.2.0:
 *   dist/core/validation/validator.js -> validateChangeDeltaSpecs()
 *     extractRequirementText()  first non-blank, non-`**key**:` line after
 *                               "### Requirement:", stopping at the first "####"
 *     containsShallOrMust()     /\b(SHALL|MUST)\b/ against THAT SINGLE LINE
 *     countScenarios()          at least one "####" per ADDED/MODIFIED block
 *
 * THE TRAP THIS GUARD EXISTS FOR: the validator compares a LINE, not a
 * paragraph. A requirement whose normative word wraps onto line 2 fails with
 * "must contain SHALL or MUST" even though the prose clearly says MUST. Keep
 * the requirement sentence on ONE physical line. When the normative word is
 * wrapped, this guard names the line it landed on instead of repeating
 * openspec's terse message.
 *
 * Deliberately NOT checked here:
 *   - "## Why" / "## What Changes": `validate` never reads proposal.md
 *     (ChangeParser.parseChangeWithDeltas is only used by `openspec change
 *     list|show` and the JSON converter), so a Why failure cannot come from
 *     `validate`. Checking it here would fail things validate accepts.
 *   - duplicate and cross-section conflicts: openspec reports those directly
 *     and they are structural, not the wrapped-prose trap.
 *   - `openspec/specs/**` (living specs): validate applies no SHALL/MUST rule
 *     there, only Purpose length and scenario presence.
 *
 * If the pinned openspec major/minor changes, re-read validator.js before
 * trusting this mirror.
 *
 * Usage:
 *   node scripts/check-openspec-deltas.mjs          # check; exit 1 on failure
 *   node scripts/check-openspec-deltas.mjs --json   # machine-readable result
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const CHANGES_ROOT = path.join(REPO_ROOT, 'openspec', 'changes');
const ARCHIVE_DIR = 'archive';
const DELTA_SECTIONS = new Set(['ADDED', 'MODIFIED']);
const NORMATIVE_RE = /\b(SHALL|MUST)\b/;

/**
 * Splits a delta spec into ADDED/MODIFIED requirement blocks.
 * Header names are captured so the diagnostic can echo the operation.
 * @param {string} content
 * @returns {Array<{ section: string, name: string, line: number,
 *   body: Array<{ text: string, line: number }> }>}
 */
export function parseDeltaBlocks(content) {
  const lines = content.split('\n').map((line) => line.replace(/\r$/, ''));
  /** @type {Array<{ section: string, name: string, line: number, body: Array<{ text: string, line: number }> }>} */
  const blocks = [];
  /** @type {null | { section: string, name: string, line: number, body: Array<{ text: string, line: number }> }} */
  let current = null;
  let section = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const sectionMatch = text.match(/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i);
    if (sectionMatch) {
      flush();
      section = sectionMatch[1].toUpperCase();
      continue;
    }
    if (/^##\s+/.test(text)) {
      flush();
      section = null;
      continue;
    }
    const requirementMatch = text.match(/^###\s+Requirement:\s*(.*)$/);
    if (section && requirementMatch) {
      flush();
      current = { section, name: requirementMatch[1].trim(), line: i + 1, body: [] };
      continue;
    }
    if (current) {
      if (/^###\s+/.test(text)) {
        flush();
        continue;
      }
      current.body.push({ text, line: i + 1 });
    }
  }
  flush();
  return blocks;
}

/**
 * Mirrors Validator.extractRequirementText: the first substantial line before
 * the first scenario header, skipping blank lines and `**Key**: value` metadata.
 * @param {Array<{ text: string, line: number }>} body
 * @returns {{ text?: string, line?: number }}
 */
export function extractRequirementText(body) {
  for (const { text, line } of body) {
    if (/^####\s+/.test(text)) return {};
    const trimmed = text.trim();
    if (trimmed.length === 0) continue;
    if (/^\*\*[^*]+\*\*:/.test(trimmed)) continue;
    return { text: trimmed, line };
  }
  return {};
}

/**
 * The requirement as prose, before the first scenario: used only to tell
 * "the normative word wrapped onto another line" apart from "there is no
 * normative word at all".
 * @param {Array<{ text: string, line: number }>} body
 * @returns {string}
 */
function paragraphBeforeScenarios(body) {
  const out = [];
  for (const { text } of body) {
    if (/^####\s+/.test(text)) break;
    out.push(text);
  }
  return out.join(' ');
}

/**
 * Checks one delta spec file's content.
 * @param {string} content
 * @param {string} relPath
 * @returns {Array<{ file: string, line: number, message: string }>}
 */
export function checkDeltaSpecContent(content, relPath = 'spec.md') {
  const issues = [];
  let normalized = content;
  if (normalized.charCodeAt(0) === 0xfeff) {
    // openspec's section parser anchors on "## " at position 0, so a BOM makes
    // every header invisible and the whole change reports "No delta sections
    // found". Report the real cause, then keep parsing to surface the rest.
    issues.push({
      file: relPath,
      line: 1,
      message:
        'file starts with a UTF-8 BOM; openspec cannot match the section headers ' +
        '(reports "No delta sections found"). Save it as UTF-8 without BOM.',
    });
    normalized = normalized.slice(1);
  }
  for (const block of parseDeltaBlocks(normalized)) {
    if (!DELTA_SECTIONS.has(block.section)) continue;
    const { text, line } = extractRequirementText(block.body);
    if (!text) {
      issues.push({
        file: relPath,
        line: block.line,
        message: `${block.section} "${block.name}" is missing requirement text`,
      });
    } else if (!NORMATIVE_RE.test(text)) {
      const paragraph = paragraphBeforeScenarios(block.body);
      const wrapped = NORMATIVE_RE.test(paragraph);
      issues.push({
        file: relPath,
        line: block.line,
        message: wrapped
          ? `${block.section} "${block.name}": SHALL/MUST is not on the first line of the ` +
            `requirement body (line ${line}). openspec 1.2.0 reads ONLY that line, so unwrap ` +
            'the requirement sentence onto one physical line.'
          : `${block.section} "${block.name}" must contain SHALL or MUST`,
      });
    }

    const scenarioCount = block.body.filter(({ text: t }) => /^####\s+/.test(t)).length;
    if (scenarioCount < 1) {
      issues.push({
        file: relPath,
        line: block.line,
        message: `${block.section} "${block.name}" must include at least one scenario`,
      });
    }
  }
  return issues;
}

/**
 * Lists every active (non-archived) delta spec under openspec/changes.
 * @param {string} [changesRoot]
 * @returns {string[]} absolute paths
 */
export function findDeltaSpecFiles(changesRoot = CHANGES_ROOT) {
  if (!fs.existsSync(changesRoot)) return [];
  const files = [];
  for (const change of fs.readdirSync(changesRoot, { withFileTypes: true })) {
    if (!change.isDirectory() || change.name === ARCHIVE_DIR) continue;
    const specsDir = path.join(changesRoot, change.name, 'specs');
    if (!fs.existsSync(specsDir)) continue;
    for (const spec of fs.readdirSync(specsDir, { withFileTypes: true })) {
      if (!spec.isDirectory()) continue;
      const specFile = path.join(specsDir, spec.name, 'spec.md');
      if (fs.existsSync(specFile)) files.push(specFile);
    }
  }
  return files.sort();
}

/**
 * @param {{ changesRoot?: string }} [options]
 * @returns {{ ok: boolean, scanned: number, issues: Array<{ file: string, line: number, message: string }> }}
 */
export function checkOpenSpecDeltas(options = {}) {
  const changesRoot = options.changesRoot ?? CHANGES_ROOT;
  // Diagnostics stay repo-relative in the real run and readable in fixtures.
  const projectRoot = path.resolve(changesRoot, '..', '..');
  const files = findDeltaSpecFiles(changesRoot);
  const issues = [];
  for (const file of files) {
    const relPath = path.relative(projectRoot, file).split(path.sep).join('/');
    issues.push(...checkDeltaSpecContent(fs.readFileSync(file, 'utf8'), relPath));
  }
  return { ok: issues.length === 0, scanned: files.length, issues };
}

function main(argv) {
  const json = argv.includes('--json');
  const result = checkOpenSpecDeltas();
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`openspec deltas OK: ${result.scanned} delta spec file(s) checked.`);
  } else {
    for (const issue of result.issues) {
      console.error(`${issue.file}:${issue.line}: ${issue.message}`);
    }
    console.error(`\n${result.issues.length} issue(s) across ${result.scanned} delta spec file(s).`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
