#!/usr/bin/env node

/**
 * nn-conntent/scripts/produce.mjs
 *
 * `produce <episode>`: the single deterministic entry point (capability
 * video-produce-command). It runs intake, the review gate, the estimate, the budget gate,
 * synthesis, compile, render, formats and the lifecycle writes in one order, and stops only
 * at a script review (exit 10) or before spend (exit 11).
 *
 * Exit codes: 0 done, 10 awaiting review, 11 over budget / budget unset, 1 error.
 *
 * Zero external dependencies. ESM module.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findBlueprintPackage } from './lib/video-scope.mjs';
import { loadCascadeBags, withScriptPresets } from './lib/video-scope.mjs';
import { parseKnowledgeDocument } from './lib/knowledge-model.mjs';
import {
  EpisodeError,
  assertProducible,
  readEpisode,
  resolveForEpisode,
  unknownKeys,
} from './lib/episode.mjs';
import {
  ChangesetError,
  applyChanges,
  applyChangesetFile,
  dryApply as defaultDryApply,
  fieldChange,
} from './lib/changes.mjs';
import { evaluateGate, readAppliedVerdicts } from './lib/gates.mjs';
import { scriptGateStates, scriptSubjectsForEpisode } from './lib/review-subject.mjs';
import { budgetGateTarget, spendPlan } from './lib/spend-gate.mjs';
import { estimateScriptCost } from './asset-cost-estimator.mjs';
import { randomUUID } from 'node:crypto';
import { readTimingRows, readLedgerRows } from './lib/facts.mjs';
import { chapterLines, readManifestForFinalize } from './lib/description.mjs';
import { DELIVERY_FORMATS, renderFormats } from './render-formats.mjs';
import { renderVideo } from './lib/render.mjs';
import { synthesizeAvatars } from './synthesize-avatar.mjs';
import { isAvatarLayer } from './lib/avatar-jobs.mjs';
import { resolveWorkspace } from './lib/video-guard.mjs';
import { checkOverlays } from './lib/overlay-qa.mjs';
import { recordStage, synthesizeEpisodeAssets } from './lib/compile.mjs';

export const EXIT_DONE = 0;
export const EXIT_REVIEW = 10;
export const EXIT_BUDGET = 11;
export const EXIT_ERROR = 1;

export const PROPOSAL_FILENAME = 'proposal_changes_NN.md';
const EPISODE_DOC_RE = /_coNNtent_NN\.md$/i;

/** The derivation preset whose dimensions are exactly `size`, or null. */
function presetForSize(size) {
  return Object.keys(DELIVERY_FORMATS).find(
    (name) => `${DELIVERY_FORMATS[name].width}x${DELIVERY_FORMATS[name].height}` === size,
  ) || null;
}

export class ProduceStop extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ProduceStop';
    this.code = code;
    this.exitCode = extra.exitCode ?? EXIT_ERROR;
    this.details = extra.details || {};
  }
}

/** The installed coNNtent blueprint version, read from the package spec. */
export function installedBlueprintVersion(pkgDir = null) {
  const dir = pkgDir || findBlueprintPackage();
  const model = parseKnowledgeDocument(fs.readFileSync(path.join(dir, 'spec_NN.md'), 'utf8'));
  return model.frontmatter?.blueprint_version;
}

/** The episode document for an argument that may name the folder or the file. */
export function resolveEpisodePath(input) {
  const abs = path.resolve(input);
  if (!fs.existsSync(abs)) throw new ProduceStop('episode-not-found', `Episode not found: ${abs}`);
  if (fs.statSync(abs).isFile()) return abs;
  const docs = fs.readdirSync(abs).filter((name) => EPISODE_DOC_RE.test(name));
  if (docs.length !== 1) {
    throw new ProduceStop(
      'episode-document-not-found',
      `Expected exactly one <slug>_coNNtent_NN.md in ${abs}, found ${docs.length}.`,
    );
  }
  return path.join(abs, docs[0]);
}

/**
 * The model id the changeset target uses. `Video` is a distributed concept, so an
 * episode is an instance model addressed by its container chain and its own slug
 * (`<series>/<episode>`), never by its file stem (`e_coNNtent`). A document placed
 * under `<container>/episodes/<slug>/` keeps the distributed rule; anything else uses
 * the compact-model rule: the stem.
 */
export const modelIdOf = (scriptPath) => {
  const folder = path.dirname(scriptPath);
  const slug = path.basename(folder);
  const parent = path.basename(path.dirname(folder));
  if (parent === 'episodes') {
    const container = path.basename(path.dirname(path.dirname(folder)));
    if (container) return `${container}/${slug}`;
  }
  return path.basename(scriptPath, '.md').replace(/_NN$/, '');
};

/**
 * Intake: validate the proposal on a throwaway copy, then apply it for real and set
 * `status:: draft` in a separate engine changeset (design A4).
 */
async function intake({ rootDir, episodePath, modelId, deps, log }) {
  const proposalPath = path.join(path.dirname(episodePath), PROPOSAL_FILENAME);
  if (!fs.existsSync(proposalPath)) {
    throw new ProduceStop(
      'no-proposal',
      `The episode is in "idea" and no script was proposed: expected ${PROPOSAL_FILENAME} in ${path.dirname(episodePath)}.`,
    );
  }
  const dry = await (deps.dryApply || defaultDryApply)({ rootDir, episodePath, changesetPath: proposalPath });
  if (!dry.ok) {
    const problem = dry.problem || { code: 'changeset-rejected', message: 'The proposal was rejected.' };
    throw new ProduceStop(problem.code, `The proposed changeset was refused: ${problem.message}`);
  }
  const applied = parseKnowledgeDocument(dry.text);
  const problems = unknownKeys(applied, deps.registry);
  if (problems.length > 0) {
    const named = problems.map((p) => `${p.element}.${p.key}`).join(', ');
    throw new ProduceStop('unknown-key', `The proposed changeset introduces unknown field keys: ${named}. Nothing was applied.`);
  }
  // Same seal, same body: the real apply runs the file the dry apply validated.
  const appliedReal = await (deps.applyFile || applyChangesetFile)(rootDir, proposalPath);
  log(`intake: applied ${PROPOSAL_FILENAME} (${appliedReal.changesetPath})`);
  const real = await (deps.apply || applyChanges)(rootDir, [
    {
      op: 'update_field',
      target: `${modelId}@${deps.videoSlug || appliedVideoSlug(applied)}&status`,
      to: 'draft',
    },
  ], { title: 'engine: intake' });
  log(`intake: status:: draft (${real.changesetPath})`);
}

/** The Video slug of a parsed episode, used when the caller did not pass one. */
function appliedVideoSlug(model) {
  const video = (model.elements?.Video || [])[0];
  return String(video?.fields?.slug || video?.slug || '');
}

/**
 * Runs one produce pass.
 * @param {{ episodePath: string, approve?: string, dryRun?: boolean, deps?: object }} options
 * @returns {Promise<{ code: number, summary?: object, stop?: object }>}
 */
export async function produce(options) {
  const deps = options.deps || {};
  const log = deps.log || ((line) => console.log(line));
  const scriptPath = resolveEpisodePath(options.episodePath);
  const episodeDir = path.dirname(scriptPath);
  const rootDir = resolveWorkspace(episodeDir).root;
  const installed = deps.installedVersion || installedBlueprintVersion(deps.packageDir);

  let episode = readEpisode(scriptPath, { model: deps.model });
  try {
    assertProducible(episode, installed);
  } catch (err) {
    if (err instanceof EpisodeError) throw new ProduceStop(err.code, err.message);
    throw err;
  }
  const modelId = modelIdOf(scriptPath);

  const language = resolveForEpisode(episode.model, scriptPath, 'language').value;
  if (!language) {
    throw new ProduceStop(
      'missing-language',
      `${path.basename(scriptPath)} resolves no language. Declare language:: in the episode, the Series or the domain defaults.`,
    );
  }

  // 1. Intake (idea only).
  if (episode.status === 'idea') {
    await intake({ rootDir, episodePath: scriptPath, modelId, deps: { videoSlug: episode.slug, ...deps }, log });
    episode = readEpisode(scriptPath);
  }

  // 2. Script gate: derived from applied human verdicts and the current scene hashes.
  const gates = resolveForEpisode(episode.model, scriptPath, 'review_gates').value;
  const gateList = Array.isArray(gates) ? gates.map(String) : gates ? [String(gates)] : ['script', 'preview'];
  if (gateList.includes('script')) {
    const bags = withScriptPresets(loadCascadeBags(path.dirname(scriptPath)), episode.model, scriptPath);
    const subjects = scriptSubjectsForEpisode({
      model: episode.model,
      bags,
      scriptDir: path.dirname(scriptPath),
      language,
    });
    const verdicts = readAppliedVerdicts(rootDir, modelId);
    const pending = scriptGateStates(subjects, verdicts).filter((state) => state.state !== 'approved');
    if (pending.length > 0) {
      const lines = pending.map((state) => {
        const cause = state.cause?.detail ? ` (${state.cause.kind}: ${state.cause.detail})` : '';
        const notes = state.notes ? ` — ${state.notes}` : '';
        return `  - ${state.scene}: ${state.state}${notes}${cause}`;
      });
      const detail =
        `Review required: ${pending.length} scene(s) are not approved.\n${lines.join('\n')}\n` +
        `Open the console, approve the script gate, then run produce again.`;
      throw new ProduceStop('review-required', detail, { exitCode: EXIT_REVIEW, details: { pending } });
    }
  }

  // 3. Lifecycle: approved (before any spend).
  if (episode.status !== 'approved' && episode.status !== 'produced') {
    await (deps.apply || applyChanges)(rootDir, [
      fieldChange(modelId, episode.slug, 'status', 'approved', episode.status),
    ], { title: 'engine: approved' });
    log('lifecycle: status:: approved');
    episode = readEpisode(scriptPath);
  }

  // 4. Estimate and the spend decision (before any provider call).
  const estimate = (deps.estimate || estimateScriptCost)(scriptPath);
  const planHash = estimate.planHash;
  const total = estimate.summary.grandTotalCost;
  const budget = resolveForEpisode(episode.model, scriptPath, 'budget').value;
  const budgetUsd = budget === null || budget === undefined || budget === '' ? null : Number(budget);
  const spend = spendPlan({
    reviewGates: gateList,
    total,
    budget: budgetUsd,
    prePreviewSubtotal: (estimate.summary.totalImageCost || 0) + (estimate.summary.totalTtsCost || 0),
    planHash,
  });
  if (spend.stop) {
    throw new ProduceStop(spend.stop.code, spend.stop.message, {
      exitCode: spend.stop.exitCode,
      details: { planHash, total },
    });
  }
  if (spend.budgetGate) {
    // The inserted episode-level budget gate: a human verdict carries the plan hash.
    const verdicts = readAppliedVerdicts(rootDir, modelId);
    const state = evaluateGate({ ...budgetGateTarget({ modelId, planHash }), verdicts });
    if (state.state !== 'approved') {
      throw new ProduceStop(
        'budget-gate',
        `The estimate $${total.toFixed(4)} exceeds the budget $${Number(budgetUsd).toFixed(2)} ` +
          `(plan ${planHash}). Approve the budget gate in the console with this hash, or lower the script.`,
        { exitCode: EXIT_REVIEW, details: { planHash, total, budget: budgetUsd } },
      );
    }
  }
  if (gateList.includes('preview') && Number(total) > Number(budgetUsd) + 1e-9) {
    // Safety until the per-scene preview hash lands with the asset cache keys: an
    // over-budget run is never spent past the preview gate.
    throw new ProduceStop(
      'preview-required',
      `The estimate $${total.toFixed(4)} exceeds the budget $${Number(budgetUsd).toFixed(2)} ` +
        `(plan ${planHash}). Approve the preview gate in the console before spending.`,
      { exitCode: EXIT_REVIEW, details: { planHash, total, budget: budgetUsd } },
    );
  }

  // The rolling daily ceiling is a domain/blueprint declaration (design A14), not a
  // per-run knob: it is checked against what the facts ledger already charged in the
  // last 24h. `--approve` is about the episode's budget, never about the daily ceiling.
  const dailyBudget = resolveForEpisode(episode.model, scriptPath, 'daily_budget').value;
  const dailyBudgetUsd = dailyBudget === null || dailyBudget === undefined || dailyBudget === '' ? null : Number(dailyBudget);
  if (dailyBudgetUsd !== null && Number.isFinite(dailyBudgetUsd)) {
    const now = Date.now();
    const spent24h = readLedgerRows(rootDir).reduce((sum, row) => {
      const ts = Date.parse(row.ts);
      if (!Number.isFinite(ts) || now - ts > 24 * 60 * 60 * 1000) return sum;
      const usd = Number(row.est_usd);
      return sum + (Number.isFinite(usd) && usd > 0 ? usd : 0);
    }, 0);
    if (spent24h + total > dailyBudgetUsd + 1e-9) {
      throw new ProduceStop(
        'daily-budget-exceeded',
        `The 24h window already spent $${spent24h.toFixed(4)} and this run estimates $${total.toFixed(4)}, ` +
          `over the daily_budget $${dailyBudgetUsd.toFixed(2)} (plan ${planHash.slice(0, 8)}). ` +
          'Lower the script, or raise daily_budget at the domain level. --approve does not bypass this ceiling.',
        { exitCode: EXIT_BUDGET, details: { planHash, total, dailyBudget: dailyBudgetUsd, spent24h } },
      );
    }
  }

  if (options.dryRun) {
    log(`plan: $${total.toFixed(4)} of $${budgetUsd === null ? 'unset' : budgetUsd.toFixed(2)} (plan ${planHash.slice(0, 8)}); dry run, nothing spent.`);
    return { code: EXIT_DONE, summary: { planHash, total, budget: budgetUsd, dryRun: true } };
  }

  const runId = deps.runId || randomUUID();
  const facts = { rootDir, runId, episode: episode.slug, planHash };

  // 4b. Synthesis of audio and images (before avatars so narration audio is cached for avatars)
  const synthAssets = deps.synthesizeEpisodeAssets || synthesizeEpisodeAssets;
  await synthAssets({ scriptPath, facts, recordSynthesisStages: true });

  // 4c. The avatar stage. Talking avatars are the costliest call and the only stage a
  // render cannot do itself: it refuses a layer with no cached clip. produce therefore runs
  // it here, before the render, whenever the episode actually has one.
  const avatarLayers = (episode.model.elements?.Layer || []).filter(isAvatarLayer);
  if (avatarLayers.length > 0 && !options.dryRun) {
    const sync = (deps.synthesizeAvatars || synthesizeAvatars);
    await sync({ scriptPath });
    log(`avatars: ${avatarLayers.length} layer(s) synthesized or picked up from cache`);
  }

  // 5. Compile + render the master.
  const render = deps.render || renderVideo;
  const rendered = await render({
    scriptPath,
    facts,
    gsapPath: deps.gsapPath,
    stageDeps: deps.stageDeps,
    recordSynthesisStages: false,
  });
  const masterPath = rendered.outputVideoPath;
  log(`render: ${masterPath} (${rendered.renderTimeMs} ms, link_mode=${rendered.linkMode || 'link'})`);

  // 5b. Overlay QA gate: verify index.html exists and contains mount hosts for all overlays in manifest
  const qaStart = Date.now();
  const projectIndexHtmlPath = path.join(episodeDir, 'hyperframes', 'index.html');
  if (!fs.existsSync(projectIndexHtmlPath)) {
    throw new ProduceStop(
      'overlay-qa-failed',
      `HyperFrames index.html missing at ${projectIndexHtmlPath}`,
      { exitCode: EXIT_ERROR, details: { missing: ['index.html'] } },
    );
  }
  const indexHtml = fs.readFileSync(projectIndexHtmlPath, 'utf8');
  const { manifest } = readManifestForFinalize({ episodeDir, scriptPath });
  const missingOverlays = checkOverlays({ manifest, indexHtml });
  if (missingOverlays.length > 0) {
    throw new ProduceStop(
      'overlay-qa-failed',
      `Overlay QA gate failed: missing host elements in index.html for overlays: ${missingOverlays.join(', ')}`,
      { exitCode: EXIT_ERROR, details: { missing: missingOverlays } },
    );
  }
  recordStage(facts, { stage: 'qa', start: qaStart, end: Date.now() });

  // 6. Formats: every declared output after the first must exist.
  const declared = resolveForEpisode(episode.model, scriptPath, 'output_formats').value;
  const sizes = Array.isArray(declared) ? declared.map(String) : [];
  const derived = sizes.slice(1);
  const presets = [];
  for (const size of derived) {
    const preset = presetForSize(size);
    if (!preset) {
      throw new ProduceStop(
        'unsupported-format',
        `output_formats declares ${size}, which the derivation has no preset for (known: ${Object.keys(DELIVERY_FORMATS).join(', ')}).`,
      );
    }
    presets.push(preset);
  }
  let formats = [];
  if (presets.length > 0) {
    const made = await (deps.formats || renderFormats)({
      master: masterPath,
      outDir: path.join(episodeDir, 'formats'),
      formats: presets,
      force: true,
    });
    formats = made.variants || [];
    log(`formats: ${formats.filter((v) => !v.skipped).length} derived under ${path.join(episodeDir, 'formats')}`);
  }

  // 6b. Chapters: the printable block comes from the manifest the render just wrote.
  // An authored description.md wins — produce only seeds one when it is absent.
  const chapters = chapterLines(manifest);
  const descriptionPath = path.join(episodeDir, 'description.md');
  if (!fs.existsSync(descriptionPath)) {
    fs.writeFileSync(descriptionPath, chapters.join('\n') + '\n', 'utf8');
    log(`description: chapters written to ${descriptionPath}`);
  } else {
    log(`description: chapters (the authored file was left untouched)\n${chapters.join('\n')}`);
  }

  // 7. Lifecycle: produced, only after the master and every declared format exist.
  await (deps.apply || applyChanges)(rootDir, [
    fieldChange(modelId, episode.slug, 'master', path.basename(masterPath)),
    fieldChange(modelId, episode.slug, 'status', 'produced'),
  ], { title: 'engine: produced' });
  log('lifecycle: status:: produced');

  const timings = readTimingRows(rootDir).filter((row) => row.run_id === runId);
  const summary = {
    planHash,
    estimateUsd: total,
    budgetUsd,
    realUsd: rendered.spentUsd || 0,
    linkMode: rendered.linkMode || 'link',
    master: masterPath,
    formats,
    stages: timings.map((row) => ({
      stage: row.stage,
      durationMs: row.duration_ms,
      hits: row.cache?.hits || 0,
      misses: row.cache?.misses || 0,
    })),
  };
  return { code: EXIT_DONE, summary };
}

const USAGE = [
  'Usage: node produce.mjs <episode-doc-or-folder> [options]',
  '  --dry-run               estimate and stop before any spend',
  '',
  'Exit codes: 0 done, 10 a gate is open, 11 a spend stop no verdict can satisfy, 1 error.',
].join('\n');

function parseFlags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === 'dry-run') out.dryRun = true;
    else throw new ProduceStop('unknown-option', `Unknown option --${key}`);
  }
  return out;
}

async function main() {
  let flags;
  try {
    flags = parseFlags(process.argv.slice(2));
  } catch (err) {
    console.error(`❌ [produce] ${err.message}\n${USAGE}`);
    process.exit(EXIT_ERROR);
  }
  if (!flags._[0]) {
    console.error(USAGE);
    process.exit(EXIT_ERROR);
  }
  try {
    const result = await produce({ episodePath: flags._[0], dryRun: flags.dryRun });
    if (result.summary && result.summary.stages) {
      for (const stage of result.summary.stages) {
        console.log(
          `  ${stage.stage.padEnd(8)} ${String(stage.durationMs).padStart(6)} ms  cache ${stage.hits} hit / ${stage.misses} miss`,
        );
      }
      console.log(
        `Real cost $${result.summary.realUsd.toFixed(4)} of $${result.summary.estimateUsd.toFixed(4)} estimated, ` +
          `budget $${result.summary.budgetUsd.toFixed(2)}, link_mode ${result.summary.linkMode}`,
      );
    }
    process.exit(result.code);
  } catch (err) {
    if (err instanceof ProduceStop || err instanceof EpisodeError || err instanceof ChangesetError) {
      console.error(`❌ [produce] ${err.message}`);
      process.exit(err.exitCode || EXIT_ERROR);
    }
    throw err;
  }
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((err) => {
    console.error(`❌ [produce] ${err?.stack || err}`);
    process.exit(EXIT_ERROR);
  });
}
