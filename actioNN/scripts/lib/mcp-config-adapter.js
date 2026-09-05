/**
 * actioNN/scripts/lib/mcp-config-adapter.js
 *
 * Universal MCP configuration adapter for AI agents:
 * - OpenCode (~/.config/opencode/opencode.json or opencode.jsonc)
 * - Claude Code (~/.claude.json)
 * - Antigravity (~/.gemini/antigravity.json)
 * - Codex / Generic environments
 *
 * Guarantees atomic writes, strict UTF-8 without BOM, and full idempotency.
 * Zero external dependencies — native Node.js execution.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveJsonAtomic } = require('../../../scripts/lib/atomic-fs.js');

/**
 * Reads a JSON file safely, stripping UTF-8 Byte Order Mark (BOM) if present.
 * @param {string} filePath
 * @returns {any}
 */
function readJsonClean(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

/**
 * Writes data to a JSON file atomically, strictly UTF-8 without BOM.
 * @param {string} filePath
 * @param {any} data
 * @param {number} [indent=2]
 */
function writeJsonClean(filePath, data, indent = 2) {
  saveJsonAtomic(filePath, data, indent);
}

/**
 * Registers an MCP server in OpenCode configuration.
 * @param {{
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'opencode', file: string, updated: boolean }}
 */
function registerMcpForOpenCode({ configFile, serverName = 'innfo-mcp', bundlePath }) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  /** @type {Record<string, any>} */
  let config = {};
  if (fs.existsSync(configFile)) {
    try {
      config = readJsonClean(configFile);
    } catch {
      config = {};
    }
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    config = {};
  }

  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }

  if (!config.mcp || typeof config.mcp !== 'object' || Array.isArray(config.mcp)) {
    config.mcp = {};
  }

  const existing = config.mcp[serverName];
  const targetCommand = ['node', bundlePath];

  if (
    existing &&
    existing.type === 'local' &&
    existing.enabled === true &&
    Array.isArray(existing.command) &&
    existing.command.length === 2 &&
    existing.command[0] === 'node' &&
    existing.command[1] === bundlePath
  ) {
    return { agent: 'opencode', file: configFile, updated: false };
  }

  config.mcp[serverName] = {
    type: 'local',
    command: targetCommand,
    enabled: true,
  };

  writeJsonClean(configFile, config);
  return { agent: 'opencode', file: configFile, updated: true };
}

/**
 * Generic helper for agents using the standard mcpServers object format (Claude, Antigravity).
 * @param {{
 *   agent: 'claude' | 'antigravity',
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'claude' | 'antigravity', file: string, updated: boolean }}
 */
function registerMcpServersFormat({ agent, configFile, serverName = 'innfo-mcp', bundlePath }) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  /** @type {Record<string, any>} */
  let config = {};
  if (fs.existsSync(configFile)) {
    try {
      config = readJsonClean(configFile);
    } catch {
      config = {};
    }
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    config = {};
  }

  if (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers)) {
    config.mcpServers = {};
  }

  const existing = config.mcpServers[serverName];
  if (
    existing &&
    existing.command === 'node' &&
    Array.isArray(existing.args) &&
    existing.args.length === 1 &&
    existing.args[0] === bundlePath
  ) {
    return { agent, file: configFile, updated: false };
  }

  config.mcpServers[serverName] = {
    command: 'node',
    args: [bundlePath],
  };

  writeJsonClean(configFile, config);
  return { agent, file: configFile, updated: true };
}

/**
 * Registers an MCP server in Claude Code configuration (~/.claude.json).
 * @param {{
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'claude', file: string, updated: boolean }}
 */
function registerMcpForClaude(options) {
  const res = registerMcpServersFormat({ ...options, agent: 'claude' });
  return { agent: 'claude', file: res.file, updated: res.updated };
}

/**
 * Registers an MCP server in Antigravity configuration (~/.gemini/antigravity.json).
 * @param {{
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'antigravity', file: string, updated: boolean }}
 */
function registerMcpForAntigravity(options) {
  const res = registerMcpServersFormat({ ...options, agent: 'antigravity' });
  return { agent: 'antigravity', file: res.file, updated: res.updated };
}

/**
 * Automatically discovers active agent environments and registers MCP server.
 * @param {{
 *   bundlePath: string,
 *   serverName?: string,
 *   homedir?: string,
 *   targetAgent?: string,
 * }} options
 * @returns {Array<{ agent: string, file: string, updated: boolean }>}
 */
function registerMcpAuto({ bundlePath, serverName = 'innfo-mcp', homedir = os.homedir(), targetAgent = 'auto' }) {
  const results = [];
  const normalizedAgent = (targetAgent || 'auto').toLowerCase();

  const opencodeDir = path.join(homedir, '.config', 'opencode');
  const opencodeJson = path.join(opencodeDir, 'opencode.json');
  const opencodeJsonc = path.join(opencodeDir, 'opencode.jsonc');
  const claudeJson = path.join(homedir, '.claude.json');
  const geminiDir = path.join(homedir, '.gemini');
  const antigravityJson = path.join(geminiDir, 'antigravity.json');

  if (normalizedAgent === 'opencode') {
    const targetFile = fs.existsSync(opencodeJsonc) && !fs.existsSync(opencodeJson) ? opencodeJsonc : opencodeJson;
    results.push(registerMcpForOpenCode({ configFile: targetFile, serverName, bundlePath }));
    return results;
  }

  if (normalizedAgent === 'claude') {
    results.push(registerMcpForClaude({ configFile: claudeJson, serverName, bundlePath }));
    return results;
  }

  if (normalizedAgent === 'antigravity') {
    results.push(registerMcpForAntigravity({ configFile: antigravityJson, serverName, bundlePath }));
    return results;
  }

  let matchedAny = false;

  // Check OpenCode
  if (fs.existsSync(opencodeDir) || process.env.OPENCODE_SESSION_ID || process.env.OPENCODE_RUN_ID) {
    const targetFile = fs.existsSync(opencodeJsonc) && !fs.existsSync(opencodeJson) ? opencodeJsonc : opencodeJson;
    results.push(registerMcpForOpenCode({ configFile: targetFile, serverName, bundlePath }));
    matchedAny = true;
  }

  // Check Claude Code
  if (fs.existsSync(claudeJson) || process.env.CLAUDE_CODE || process.env.CLAUDE_PROJECT_DIR) {
    results.push(registerMcpForClaude({ configFile: claudeJson, serverName, bundlePath }));
    matchedAny = true;
  }

  // Check Antigravity
  if (fs.existsSync(geminiDir) || process.env.ANTIGRAVITY || process.env.GEMINI_CLI) {
    results.push(registerMcpForAntigravity({ configFile: antigravityJson, serverName, bundlePath }));
    matchedAny = true;
  }

  // Fallback: If no specific environment found, ensure OpenCode config is populated (primary default)
  if (!matchedAny) {
    results.push(registerMcpForOpenCode({ configFile: opencodeJson, serverName, bundlePath }));
  }

  return results;
}

module.exports = {
  readJsonClean,
  writeJsonClean,
  registerMcpForOpenCode,
  registerMcpForClaude,
  registerMcpForAntigravity,
  registerMcpAuto,
};
