// Reports Pages whose citations point at an older member of a code-fact family.
// superseded: the cited heading still resolves in the newest member (reported, not failing).
// unresolved_in_latest: it no longer does (failing). staleHashes: a member edited in place (failing).
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { byText, walkFiles } from './lib/walk-files.mjs';

const require = createRequire(import.meta.url);
const { checkScanImpact, findStaleSources } = require('../../skills/nn-sources/scripts/lib/impact-checker.js');


/** @returns {{ superseded: object[], unresolved: object[], staleHashes: string[] }} */
export function checkStaleness(domainDir) {
  const superseded = [];
  const unresolved = [];
  for (const family of checkScanImpact(domainDir)) {
    for (const a of family.affectedModels) {
      const finding = { page: a.element ?? '', file: a.modelFile, citation: a.citation, status: a.status, latest: family.latest };
      (a.status === 'unresolved_in_latest' ? unresolved : superseded).push(finding);
    }
  }
  const order = (a, b) => byText(a.file, b.file) || byText(a.page, b.page) || byText(a.citation, b.citation);
  superseded.sort(order);
  unresolved.sort(order);
  const staleHashes = [...findStaleSources(domainDir, walkFiles(domainDir, 'sources'))].sort(byText);
  return { superseded, unresolved, staleHashes };
}

/** @returns {0 | 1} 1 only when something is unresolved in the latest member or a hash is stale. */
export function run({ domainDir, json = false, log = console.log }) {
  const found = checkStaleness(domainDir);
  if (json) {
    log(JSON.stringify(found, null, 2));
  } else if (!found.superseded.length && !found.unresolved.length && !found.staleHashes.length) {
    log('no stale citations');
  } else {
    for (const f of found.unresolved) log(`unresolved_in_latest: Page "${f.page}" (${f.file}) cites ${f.citation}; the newest member is ${f.latest}`);
    for (const f of found.superseded) log(`superseded: Page "${f.page}" (${f.file}) cites ${f.citation}; the newest member is ${f.latest}`);
    for (const m of found.staleHashes) log(`stale hash: ${m} no longer matches its sidecar (edited in place)`);
  }
  return found.unresolved.length || found.staleHashes.length ? 1 : 0;
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--domain');
  const repo = path.resolve(path.dirname(here), '../..');
  const domainDir = at >= 0 && args[at + 1] ? path.resolve(args[at + 1]) : path.join(repo, 'site_NN');
  process.exitCode = run({ domainDir, json: args.includes('--json') });
}
