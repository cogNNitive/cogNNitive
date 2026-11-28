/**
 * scripts/lib/yaml-parser.js
 *
 * Focused YAML subset parser and markdown frontmatter extractor.
 * Zero external dependencies — delegates parsing to skills/nn-preflight/scripts/lib/yaml-lite.js
 * and owns parseManifest.
 */

const {
  parseScalar,
  parseMappingItem,
  parseSequence,
  parseBlock,
  parseFocusedYaml,
  parseFrontmatter,
} = require('../../skills/nn-preflight/scripts/lib/yaml-lite.js')

/**
 * Extracts the parsed manifest structure from the frontmatter of manifest_NN.md.
 *
 * @param {string} text Full raw text of manifest_NN.md
 * @returns {{
 *   version: string,
 *   entrypoint: string,
 *   skills: any[],
 *   blueprints: any[],
 *   workflows: any[],
 *   mcp: any[],
 *   consoleAssets: any[],
 * }}
 */
function parseManifest(text) {
  const doc = parseFocusedYaml(parseFrontmatter(text))
  const bootstrap = doc['agent-bootstrap']
  if (!bootstrap || typeof bootstrap !== 'object') {
    throw new Error('agent-bootstrap block not found in manifest')
  }
  if (!Array.isArray(bootstrap.skills)) {
    throw new Error('agent-bootstrap.skills is not a list')
  }
  const blueprints = Array.isArray(bootstrap.blueprints) ? bootstrap.blueprints : []
  const workflows = Array.isArray(bootstrap.workflows) ? bootstrap.workflows : []
  // MCP servers live nested inside the skill that owns them
  // (`agent-bootstrap.skills[].mcp[]`); a top-level `agent-bootstrap.mcp` is
  // still honored for backward compatibility. Merge both, de-duplicating by
  // name so the first declaration wins.
  const mcp = []
  if (Array.isArray(bootstrap.mcp)) mcp.push(...bootstrap.mcp)
  for (const skill of bootstrap.skills) {
    if (Array.isArray(skill.mcp)) mcp.push(...skill.mcp)
  }
  const seenMcpNames = new Set()
  const dedupedMcp = mcp.filter((server) => {
    if (!server || !server.name || seenMcpNames.has(server.name)) return false
    seenMcpNames.add(server.name)
    return true
  })
  const consoleAssets = Array.isArray(bootstrap['console-assets'])
    ? bootstrap['console-assets']
    : []
  return {
    version: bootstrap.version,
    entrypoint: bootstrap.entrypoint,
    skills: bootstrap.skills,
    blueprints,
    workflows,
    mcp: dedupedMcp,
    consoleAssets,
  }
}

module.exports = {
  parseScalar,
  parseMappingItem,
  parseSequence,
  parseBlock,
  parseFocusedYaml,
  parseFrontmatter,
  parseManifest,
}
