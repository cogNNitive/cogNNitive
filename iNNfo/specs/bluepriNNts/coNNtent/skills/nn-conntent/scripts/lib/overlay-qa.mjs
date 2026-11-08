/**
 * scripts/lib/overlay-qa.mjs
 *
 * Post-emit overlay QA gate (design D7, D8).
 * Pure function: compares declared overlays and leaked text drawables against
 * emitted overlay host elements in index.html.
 */

/**
 * Validates that all declared overlays and leaked text drawables are emitted.
 * @param {{ manifest: object, indexHtml: string }} params
 * @returns {string[]} list of missing overlay/layer ids
 */
export function checkOverlays({ manifest, indexHtml = '' }) {
  const declaredIds = new Set();

  // 1. Overlays declared in manifest.tracks.overlays
  const overlays = manifest?.tracks?.overlays || [];
  for (const o of overlays) {
    if (o && o.id) {
      declaredIds.add(String(o.id));
    }
  }

  // 2. Leaked text drawables (scene layers still carrying layer_text_content)
  const scenes = manifest?.tracks?.scenes || [];
  for (const s of scenes) {
    const layers = s?.props?.layers || [];
    for (const l of layers) {
      if (l && l.layer_text_content) {
        declaredIds.add(String(l.id || l.name || 'leaked_text_layer'));
      }
    }
  }

  if (declaredIds.size === 0) {
    return [];
  }

  // 3. Emitted overlay host elements in indexHtml
  // Match: <div id="..." class="clip nn-overlay..."
  // or <div ... id="..." ... class="clip nn-overlay..."
  const emittedIds = new Set();
  const html = String(indexHtml || '');
  const elRegex = /<div\s+([^>]*)\bclass\s*=\s*['"][^'"]*\bclip\b[^'"]*\bnn-overlay\b[^'"]*['"]([^>]*)>/gi;
  let match;
  while ((match = elRegex.exec(html)) !== null) {
    const attrs = match[1] + ' ' + match[2];
    const idMatch = attrs.match(/\bid\s*=\s*['"]([^'"]+)['"]/i);
    if (idMatch) {
      emittedIds.add(idMatch[1]);
    }
  }

  // 4. Missing = declared minus emitted
  const missing = [];
  for (const id of declaredIds) {
    if (!emittedIds.has(id)) {
      missing.push(id);
    }
  }

  return missing;
}
