#!/usr/bin/env node
/**
 * Domain State Probe
 *
 * Fast, deterministic local inspection of workspace state:
 * - Layout (current, legacy, mixed)
 * - Knowledge documents count & listing
 * - Pending sources in sources/import/
 * - Attached and workspace procedures
 * - Preflight check status with --workspace-dir
 */

const fs = require('fs');
const path = require('path');
const { runCheck } = require('./preflight-check');
const { detectLegacy } = require('./lib/legacy-detect.generated.cjs');

/**
 * Runs a deterministic probe against the target workspace directory.
 * @param {object} [options={}]
 * @param {string} [options.workspaceDir='.']
 * @param {boolean} [options.skipPreflight=false]
 * @returns {Promise<object>}
 */
async function runProbe(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || '.');

  // 1. Layout detection
  const fsReader = {
    list: async (rel) => {
      const full = path.join(workspaceDir, rel);
      return fs.existsSync(full) ? fs.readdirSync(full) : [];
    },
    read: async (rel) => fs.readFileSync(path.join(workspaceDir, rel), 'utf8'),
  };
  let layout = 'current';
  try {
    const layoutRes = await detectLegacy(fsReader);
    layout = layoutRes.kind || 'current';
  } catch {
    layout = 'unknown';
  }

  // 2. Knowledge items count
  const knowledgeDir = path.join(workspaceDir, 'kNNowledge');
  const legacyModelsDir = path.join(workspaceDir, 'models');
  let knowledgeItems = [];
  const targetKDir = fs.existsSync(knowledgeDir)
    ? knowledgeDir
    : fs.existsSync(legacyModelsDir)
      ? legacyModelsDir
      : null;
  if (targetKDir) {
    try {
      knowledgeItems = fs.readdirSync(targetKDir).filter((f) => f.endsWith('.md') && !f.startsWith('.'));
    } catch {
      knowledgeItems = [];
    }
  }

  // 3. Pending sources count
  let pendingCount = 0;
  for (const sDir of ['sources/import', 'sources/original']) {
    const full = path.join(workspaceDir, sDir);
    if (fs.existsSync(full)) {
      try {
        const walk = (d) => {
          for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
            if (ent.name.startsWith('.')) continue;
            const sub = path.join(d, ent.name);
            if (ent.isDirectory()) walk(sub);
            else if (ent.isFile()) pendingCount++;
          }
        };
        walk(full);
      } catch {
        // ignore read errors
      }
    }
  }

  // 4. Procedures count
  let domainProceduresCount = 0;
  const procDir = path.join(workspaceDir, 'procedures');
  if (fs.existsSync(procDir)) {
    try {
      domainProceduresCount = fs.readdirSync(procDir).filter((f) => f.endsWith('.md') && !f.startsWith('.')).length;
    } catch {
      domainProceduresCount = 0;
    }
  }

  let blueprintProceduresCount = 0;
  const specDir = path.join(workspaceDir, 'specs', 'bluepriNNts');
  if (fs.existsSync(specDir)) {
    try {
      for (const bp of fs.readdirSync(specDir, { withFileTypes: true })) {
        if (bp.isDirectory()) {
          const bpProc = path.join(specDir, bp.name, 'procedures');
          if (fs.existsSync(bpProc)) {
            blueprintProceduresCount += fs.readdirSync(bpProc).filter((f) => f.endsWith('.md') && !f.startsWith('.')).length;
          }
        }
      }
    } catch {
      blueprintProceduresCount = 0;
    }
  }

  // 5. Preflight check
  let preflightRes = { status: 'ok', exitCode: 0, warnings: [] };
  if (!options.skipPreflight) {
    try {
      const p = await runCheck({
        workspaceDir,
        json: true,
      });
      preflightRes = {
        status: p.status,
        exitCode: p.exitCode,
        warnings: (p.diagnostics || []).filter(
          (d) => d.status === 'WARN' || d.status === 'ACTION_REQUIRED',
        ),
      };
    } catch (e) {
      preflightRes = {
        status: 'ERROR',
        exitCode: 2,
        warnings: [{ message: e.message }],
      };
    }
  }

  return {
    version: '1.0.0',
    layout,
    preflight: preflightRes,
    knowledge: {
      count: knowledgeItems.length,
      items: knowledgeItems,
    },
    sources: {
      pending_count: pendingCount,
    },
    procedures: {
      domain_count: domainProceduresCount,
      blueprint_count: blueprintProceduresCount,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };
  const isJson = args.includes('--json');
  const skipPreflight = args.includes('--skip-preflight');
  const workspaceDir = getArg('--workspace-dir') || '.';

  try {
    const result = await runProbe({ workspaceDir, skipPreflight });
    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n=== Domain State Probe ===`);
      console.log(`Layout: ${result.layout}`);
      console.log(`Preflight: ${result.preflight.status} (exit ${result.preflight.exitCode})`);
      console.log(`Knowledge count: ${result.knowledge.count}`);
      console.log(`Pending sources: ${result.sources.pending_count}`);
      console.log(`Procedures (domain/blueprint): ${result.procedures.domain_count}/${result.procedures.blueprint_count}`);
    }
    process.exit(result.preflight.exitCode === 0 ? 0 : 1);
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ status: 'ERROR', error: err.message, exitCode: 2 }));
    } else {
      console.error(`Domain probe error: ${err.message}`);
    }
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runProbe };
