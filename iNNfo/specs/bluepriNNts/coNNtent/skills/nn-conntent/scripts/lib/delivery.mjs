/**
 * nn-conntent/scripts/lib/delivery.mjs
 *
 * Automatic delivery: assemble `deliveries/v<N>/` after QA, keep earlier versions
 * immutable, and never renumber on a non-reproducible re-encode (capability
 * conntent-delivery; design D-P6; tasks 3b-5.1/3b-5.2).
 *
 * Zero external dependencies. ESM module.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { canonicalJson } from './canonical.mjs';

export const DELIVERIES_DIR = 'deliveries';
export const DELIVERY_META = 'delivery.json';

const sha256File = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** The declared outputs as `[{ name, sha256 }]`, sorted by name. */
export function outputHashes(outputs = []) {
  return [...outputs]
    .map((file) => ({ name: path.basename(file), sha256: sha256File(file) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** `sha256` over the canonical sorted `{name, sha256}` list. */
export function outputsHash(outputs = []) {
  return crypto
    .createHash('sha256')
    .update(canonicalJson(outputHashes(outputs)))
    .digest('hex');
}

/** The highest `deliveries/v<N>/delivery.json`, or null. */
export function latestDelivery(episodeDir) {
  const root = path.join(episodeDir, DELIVERIES_DIR);
  if (!fs.existsSync(root)) return null;
  const versions = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(1)))
    .sort((a, b) => b - a);
  for (const version of versions) {
    const metaPath = path.join(root, `v${version}`, DELIVERY_META);
    if (!fs.existsSync(metaPath)) continue;
    try {
      return { version: `v${version}`, number: version, meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
    } catch {
      continue;
    }
  }
  return null;
}

/** Hard-link, or copy when the filesystem refuses the link (EXDEV/EPERM/...). */
function linkOrCopy(source, destination, linkFile) {
  try {
    linkFile(source, destination);
  } catch (err) {
    if (!['EXDEV', 'EPERM', 'EACCES', 'EMLINK', 'ENOTSUP'].includes(err?.code)) throw err;
    fs.copyFileSync(source, destination);
  }
}

/**
 * Deliver the current outputs. Returns `{ version, created, outputsHash, inputFingerprint }`.
 *
 * A new version is created only when BOTH the outputs hash and the input fingerprint
 * differ from the latest delivery; if either matches, the run is a no-op. The folder is
 * assembled in a temporary sibling and renamed into place, so a failure never exposes a
 * partial delivery.
 *
 * @param {{ episodeDir: string, outputs: string[], inputFingerprint: string,
 *   linkFile?: (source: string, destination: string) => void,
 *   now?: Date }} input
 */
export async function deliver({ episodeDir, outputs = [], inputFingerprint, linkFile = fs.linkSync, now = new Date() }) {
  const hash = outputsHash(outputs);
  const latest = latestDelivery(episodeDir);
  if (latest && (latest.meta.outputs_hash === hash || latest.meta.input_fingerprint === inputFingerprint)) {
    return { version: latest.version, created: false, outputsHash: hash, inputFingerprint };
  }

  const number = latest ? latest.number + 1 : 1;
  const deliveriesDir = path.join(episodeDir, DELIVERIES_DIR);
  fs.mkdirSync(deliveriesDir, { recursive: true });
  const staging = path.join(deliveriesDir, `.tmp-v${number}`);
  const final = path.join(deliveriesDir, `v${number}`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  try {
    const files = outputHashes(outputs);
    for (const file of outputs) {
      linkOrCopy(file, path.join(staging, path.basename(file)), linkFile);
    }
    fs.writeFileSync(
      path.join(staging, DELIVERY_META),
      JSON.stringify(
        {
          version: `v${number}`,
          outputs_hash: hash,
          input_fingerprint: inputFingerprint,
          created_at: now.toISOString(),
          files,
        },
        null,
        2,
      ),
      'utf8',
    );
    fs.renameSync(staging, final);
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }

  return { version: `v${number}`, created: true, outputsHash: hash, inputFingerprint };
}
