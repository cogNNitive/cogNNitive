#!/usr/bin/env node

/**
 * scripts/manifest/check-parity.js
 *
 * Deterministic workspace parity guard.
 * Validates local workspace files (skills, templates, MCP) against manifest/source.yaml.
 * Ensures zero drift between working tree and manifest before tagging or deploying.
 *
 * Usage:
 *   node scripts/manifest/check-parity.js [repo-root]
 *
 * Zero dependencies. Requires Node >= 18. Strictly < 200 lines.
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml, parseFrontmatter } = require('../lib/yaml-parser.js');

/**
 * Validates workspace file versions against manifest/source.yaml.
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], stats: { skillsCount: number, templatesCount: number, mcpCount: number } }}
 */
function checkWorkspaceParity(repoRoot = process.cwd()) {
  const sourcePath = path.join(repoRoot, 'manifest', 'source.yaml');
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, errors: [`manifest/source.yaml not found at ${sourcePath}`], stats: { skillsCount: 0, templatesCount: 0, mcpCount: 0 } };
  }

  const source = parseFocusedYaml(fs.readFileSync(sourcePath, 'utf8'));
  const errors = [];
  let skillsCount = 0;
  let templatesCount = 0;
  let mcpCount = 0;

  // 1. Check skills (presence only — version comparison dissolved in favor of sync-versions.mjs generator)
  for (const skill of (source.skills || [])) {
    skillsCount++;
    const skillMdPath = path.join(repoRoot, skill.path, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      errors.push(`Skill '${skill.name}': file not found at ${skillMdPath}`);
      continue;
    }

    // Check nested MCP if declared on skill
    for (const mcp of (skill.mcp || [])) {
      mcpCount++;
      const bundlePath = path.join(repoRoot, mcp.path);
      if (!fs.existsSync(bundlePath)) {
        errors.push(`MCP '${mcp.name}': bundle file not found at ${bundlePath}`);
      }
      const pkgJsonPath = path.resolve(bundlePath, '..', '..', 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          if (pkg.version && String(pkg.version) !== String(mcp.version)) {
            errors.push(`MCP '${mcp.name}': version mismatch — manifest '${mcp.version}' vs package.json '${pkg.version}'`);
          }
        } catch (e) {
          errors.push(`MCP '${mcp.name}': error parsing package.json at ${pkgJsonPath}: ${e.message}`);
        }
      }
    }
  }

  // 2. Check top-level templates
  for (const template of (source.templates || [])) {
    templatesCount++;
    const tmplPath = path.join(repoRoot, template.path);
    if (!fs.existsSync(tmplPath)) {
      errors.push(`Template '${template.name}': file not found at ${tmplPath}`);
      continue;
    }
    const text = fs.readFileSync(tmplPath, 'utf8');
    let declared = null;
    try {
      const meta = parseFocusedYaml(parseFrontmatter(text));
      // Deliberately NOT `template_version`: manifest/source.yaml's `version`
      // tracks the Level-1 spec a template conforms to, and the release-time
      // validator (manifest/lib/manifest-rules.js checkVersionParity) reads the
      // same fields. Preferring `template_version` here makes the local check
      // pass while stable-manifest validation fails on main.
      declared = meta.version !== undefined ? meta.version : (meta.spec_version !== undefined ? meta.spec_version : (meta.metadata && meta.metadata.version));
    } catch {
      // ignore
    }
    if (declared === undefined || declared === null) {
      const fnMatch = path.basename(tmplPath).match(/V_\d+-\d+-\d+/i);
      if (fnMatch) declared = fnMatch[0];
    }
    if (declared === undefined || declared === null) {
      errors.push(`Template '${template.name}': no version declared in ${tmplPath}`);
    } else if (String(declared) !== String(template.version)) {
      errors.push(`Template '${template.name}': version mismatch — manifest '${template.version}' vs template '${declared}'`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: { skillsCount, templatesCount, mcpCount },
  };
}

/**
 * CLI execution entrypoint.
 */
function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  console.log(`🔍 [check-parity] Validating workspace against manifest/source.yaml...`);
  const { ok, errors, stats } = checkWorkspaceParity(targetDir);

  if (!ok) {
    console.error(`\n❌ [check-parity] Parity check failed (${errors.length} errors):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(`✅ [check-parity] All ${stats.skillsCount} skills, ${stats.templatesCount} templates, and ${stats.mcpCount} mcp bundles in sync.`);
}

module.exports = { checkWorkspaceParity, main };

if (require.main === module) {
  main();
}