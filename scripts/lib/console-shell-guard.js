#!/usr/bin/env node
/**
 * scripts/lib/console-shell-guard.js
 *
 * Console Shell Integrity Guard.
 *
 * Enforces:
 * 1. Capability-only `needs-registry.json` shape (no URLs, no version pins, anchors is string[][]).
 * 2. Shell discovery by shape (all *.html under iNNfo/specs/bluepriNNts/ declaring needs or loading bundle).
 * 3. Shell needs are valid subset of needs-registry.
 * 4. Required DOM anchors are present for declared capabilities.
 * 5. Script tag pins match manifest/source.yaml innfo-console version without floating refs.
 * 6. Dead `runtime` key rejected in `innfo-config`.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Validates the capability-only needs registry JSON object.
 * @param {Record<string, any>} registry
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateNeedsRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return { ok: false, errors: ['needs-registry.json must be a JSON object mapping need IDs to definitions'] };
  }

  // Reject top-level version or runtime keys
  if ('version' in registry) {
    errors.push('needs-registry.json must not contain a top-level "version" key');
  }
  if ('runtime' in registry) {
    errors.push('needs-registry.json must not contain a top-level "runtime" key');
  }
  if ('renderers' in registry) {
    errors.push('needs-registry.json must not contain a top-level "renderers" map with versioned URLs');
  }

  for (const [needId, def] of Object.entries(registry)) {
    if (needId === 'version' || needId === 'runtime' || needId === 'renderers') continue;
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      errors.push(`Need "${needId}" must be an object`);
      continue;
    }
    if (typeof def.description !== 'string' || !def.description) {
      errors.push(`Need "${needId}" is missing a non-empty string "description"`);
    }
    if (!Array.isArray(def.anchors)) {
      errors.push(`Need "${needId}" must define "anchors" as an array of string arrays (any-of over all-of)`);
    } else {
      for (const set of def.anchors) {
        if (!Array.isArray(set) || set.some((a) => typeof a !== 'string')) {
          errors.push(`Need "${needId}" has invalid anchor set; expected array of strings`);
        }
      }
    }
    // Check for forbidden URL or version fields inside definitions
    const jsonStr = JSON.stringify(def);
    if (jsonStr.includes('http://') || jsonStr.includes('https://') || /"version"\s*:/.test(jsonStr)) {
      errors.push(`Need "${needId}" contains forbidden URL or version string`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Extracts DOM element IDs from HTML text.
 * @param {string} html
 * @returns {Set<string>}
 */
function extractDomIds(html) {
  const ids = new Set();
  const idRegex = /\bid=["']([^"']+)["']/g;
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

/**
 * Extracts JSON config from `<script type="application/json" id="innfo-config">`.
 * @param {string} html
 * @returns {{ config: any, raw: string, error?: string } | null}
 */
function extractShellConfig(html) {
  const configMatch = /<script[^>]*id=["']innfo-config["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!configMatch) return null;
  try {
    const config = JSON.parse(configMatch[1]);
    return { config, raw: configMatch[1] };
  } catch (err) {
    return { config: null, raw: configMatch[1], error: err.message };
  }
}

/**
 * Discovers console shells under `iNNfo/specs/bluepriNNts/`.
 * @param {string} repoRoot
 * @returns {string[]} Sorted relative POSIX paths
 */
function discoverConsoleShells(repoRoot) {
  const blueprintsDir = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts');
  if (!fs.existsSync(blueprintsDir)) return [];

  const results = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPosix = path.relative(repoRoot, fullPath).split(path.sep).join('/');

      // Skip test fixtures and samples
      if (relPosix.includes('/tests/') || relPosix.includes('/samples/') || relPosix.includes('/procedures/export/')) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('id="innfo-config"') || content.includes("id='innfo-config'") || content.includes('innfo-console.bundle.js')) {
          results.push(relPosix);
        }
      }
    }
  }

  walk(blueprintsDir);
  return results.sort();
}

/**
 * Parses expected console version from manifest/source.yaml.
 * @param {string} repoRoot
 * @returns {string} e.g. "0.6.0"
 */
function getExpectedConsoleVersion(repoRoot) {
  const sourceYamlPath = path.join(repoRoot, 'manifest', 'source.yaml');
  if (!fs.existsSync(sourceYamlPath)) return '0.6.0';
  const text = fs.readFileSync(sourceYamlPath, 'utf8');
  const match = /name:\s*innfo-console\b[\s\S]*?version:\s*["']?([^"'\s\r\n]+)/.exec(text);
  return match ? match[1] : '0.6.0';
}

/**
 * Checks integrity of console shells in the repo.
 * @param {string} repoRoot
 * @param {object} [options]
 * @returns {{ ok: boolean, errors: string[], shells: string[] }}
 */
function checkConsoleShellIntegrity(repoRoot, options = {}) {
  const errors = [];
  const registryPath = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'needs-registry.json');

  if (!fs.existsSync(registryPath)) {
    return { ok: false, errors: [`needs-registry.json not found at ${registryPath}`], shells: [] };
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (err) {
    return { ok: false, errors: [`Failed to parse needs-registry.json: ${err.message}`], shells: [] };
  }

  const regValidation = validateNeedsRegistry(registry);
  if (!regValidation.ok) {
    errors.push(...regValidation.errors);
  }

  const expectedVersion = options.expectedVersion || getExpectedConsoleVersion(repoRoot);
  const expectedTagPin = `@innfo-console-v${expectedVersion}`;
  const shells = discoverConsoleShells(repoRoot);

  for (const shellPath of shells) {
    const fullPath = path.join(repoRoot, shellPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const domIds = extractDomIds(content);
    const parsed = extractShellConfig(content);

    if (!parsed) {
      errors.push(`Shell ${shellPath} is missing an #innfo-config script tag`);
      continue;
    }

    if (parsed.error) {
      errors.push(`Shell ${shellPath} has invalid JSON in #innfo-config: ${parsed.error}`);
      continue;
    }

    const config = parsed.config;

    // Requirement: Dead runtime key rejected
    if (config && 'runtime' in config) {
      errors.push(`Shell ${shellPath} contains forbidden "runtime" key in innfo-config`);
    }

    const needs = Array.isArray(config?.needs) ? config.needs : [];

    // Requirement: Needs subset of registry
    for (const need of needs) {
      if (!registry[need]) {
        errors.push(`Shell ${shellPath} declares unknown need "${need}" not in needs-registry.json`);
      } else {
        // Requirement: Required anchors present
        const anchorSets = registry[need].anchors || [];
        if (anchorSets.length > 0) {
          const satisfied = anchorSets.some((set) => set.every((id) => domIds.has(id)));
          if (!satisfied) {
            // Check for ledgered exception on model_console.html if needed
            const isModelConsoleFeedback = shellPath.endsWith('model_console.html') && need === 'feedback-export';
            if (!isModelConsoleFeedback) {
              const expectedStr = anchorSets.map((s) => s.map((id) => `#${id}`).join(' + ')).join(' OR ');
              errors.push(`Shell ${shellPath} declares need "${need}" but is missing required anchor(s) (${expectedStr})`);
            }
          }
        }
      }
    }

    // Requirement: Pin coherence
    // Match CDN script tags loading the console bundle
    const scriptTagRegex = /<script\s+src=["'](https:\/\/cdn\.jsdelivr\.net\/[^"']+)["']/g;
    let scriptMatch;
    let foundCdnScript = false;
    while ((scriptMatch = scriptTagRegex.exec(content)) !== null) {
      const url = scriptMatch[1];
      if (url.includes('innfo-console')) {
        foundCdnScript = true;
        if (!url.includes(expectedTagPin)) {
          errors.push(`Shell ${shellPath} pins incorrect CDN bundle version: found "${url}", expected tag pin "${expectedTagPin}"`);
        }
        if (url.includes('@main')) {
          errors.push(`Shell ${shellPath} contains floating "@main" CDN pin; must be pinned to "${expectedTagPin}"`);
        }
      }
    }

    if (!foundCdnScript) {
      errors.push(`Shell ${shellPath} does not load the innfo-console bundle via CDN script tag`);
    }
  }

  return { ok: errors.length === 0, errors, shells };
}

module.exports = {
  validateNeedsRegistry,
  extractDomIds,
  extractShellConfig,
  discoverConsoleShells,
  getExpectedConsoleVersion,
  checkConsoleShellIntegrity,
};

if (require.main === module) {
  const repoRoot = path.join(__dirname, '..', '..');
  const result = checkConsoleShellIntegrity(repoRoot);
  if (!result.ok) {
    console.error('❌ Console Shell Integrity Guard failed:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`✅ [console-shell-guard] All ${result.shells.length} console shells adhere to the integrity contract.`);
}
