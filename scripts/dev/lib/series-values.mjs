// nn-retired-vocabulary: legacy-read — this tool interprets documents of the
// frozen real domain, which still uses the pre-V_0-14-0 field names.
/**
 * scripts/dev/lib/series-values.mjs
 *
 * The scattered series values of a video domain, read from whichever source the
 * series uses today, in precedence order:
 *
 *   1. the series scope marker `<series>_scope_NN.md` (post-adoption truth)
 *   3. `script_template.md` (`music`, `music_volume`, `transition`)
 *   4. the registered-voice field repeated in the `## NN Video` blocks of `<Series>_video_NN.md`
 *
 * Shared by the adoption planner and the golden validator so the two never
 * disagree about what a series declares. Read-only: it never writes.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** One `key:: value` field of a document body, or null. */
export function fieldOf(text, name) {
  return text ? (text.match(new RegExp(`^${name}:: (.+)$`, 'm'))?.[1].trim() ?? null) : null;
}

function readIf(root, rel) {
  const file = join(root, rel);
  return existsSync(file) ? readFileSync(file, 'utf-8') : null;
}

/**
 * Values of one series folder.
 * @param {string} root Domain root.
 * @param {string} series Series folder name under `series/`.
 * @returns {{ music: string|null, volume: number|null, transition: string|null,
 *   voice: string|null, voiceCounts: Record<string, number>, source: string|null }}
 */
export function seriesValues(root, series) {
  const dir = join('series', series);
  const marker = readIf(root, join(dir, `${series}_scope_NN.md`));
  const template = readIf(root, join(dir, 'script_template.md')) ?? '';

  const entries = existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : [];
  const seriesDoc = entries.find((f) => f.endsWith('_video_NN.md'));
  const docText = seriesDoc ? (readIf(root, join(dir, seriesDoc)) ?? '') : '';
  const voices = [...docText.matchAll(/^voice_id:: (.+)$/gm)].map((m) => m[1].trim());
  const voiceCounts = voices.reduce((acc, voice) => {
    acc[voice] = (acc[voice] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  const majority = Object.entries(voiceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const fromMarker = (name) => fieldOf(marker, name);
  const markerValues = {
    music: fromMarker('music'),
    volume: fromMarker('music_volume'),
    transition: fromMarker('transition'),
    voice: fromMarker('voice_id'),
  };
  const markerHit = Object.values(markerValues).some((v) => v !== null);

  const music = markerValues.music ?? fieldOf(template, 'music');
  const volumeRaw = markerValues.volume ?? fieldOf(template, 'music_volume');
  const volume = volumeRaw === null || volumeRaw === undefined || volumeRaw === '' ? null : Number(volumeRaw);
  const transition = markerValues.transition ?? fieldOf(template, 'transition');
  const voice = markerValues.voice ?? majority;

  let source = null;
  if (markerHit) source = 'scope marker';
  else if (music !== null || volume !== null || transition !== null || voice !== null) source = 'script_template.md';

  return { music, volume: Number.isFinite(volume) ? volume : null, transition, voice, voiceCounts, source };
}
