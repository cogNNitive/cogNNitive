#!/usr/bin/env node
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  registerMcpForOpenCode,
  registerMcpForClaude,
  registerMcpForAntigravity,
  registerMcpAuto,
  readJsonClean,
  writeJsonClean,
} = require('./mcp-config-adapter.js');

async function testMcpAdapter() {
  console.log('Running mcp-config-adapter unit tests...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-adapter-test-'));

  try {
    // 1. BOM-safe read and write
    {
      const bomFile = path.join(tmpDir, 'test-bom.json');
      const bomContent = '\uFEFF{"hello": "world"}';
      fs.writeFileSync(bomFile, bomContent, 'utf-8');

      const parsed = readJsonClean(bomFile);
      assert.strictEqual(parsed.hello, 'world', 'BOM was stripped and parsed cleanly');

      writeJsonClean(bomFile, { hello: 'updated' });
      const raw = fs.readFileSync(bomFile, 'utf-8');
      assert.strictEqual(raw.charCodeAt(0), 123, 'Written file does NOT have BOM (first char is {)');
      assert.strictEqual(JSON.parse(raw).hello, 'updated');
      console.log('✔ BOM-safe read and write passed');
    }

    // 2. OpenCode registration
    {
      const configFile = path.join(tmpDir, 'opencode.json');
      fs.writeFileSync(configFile, JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        mcp: {
          engram: { type: 'local', command: ['engram', 'mcp'] }
        }
      }, null, 2), 'utf-8');

      const bundlePath = 'C:\\test\\innfo-mcp.bundle.js';
      const result = registerMcpForOpenCode({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcp['innfo-mcp'], 'innfo-mcp added to mcp');
      assert.strictEqual(updated.mcp['innfo-mcp'].type, 'local');
      assert.deepStrictEqual(updated.mcp['innfo-mcp'].command, ['node', bundlePath]);
      assert.strictEqual(updated.mcp['innfo-mcp'].enabled, true);
      assert(updated.mcp.engram, 'existing engram mcp preserved');

      // Idempotency
      const result2 = registerMcpForOpenCode({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });
      assert.strictEqual(result2.updated, false, 'No mutation if already registered identically');
      console.log('✔ OpenCode MCP registration passed');
    }

    // 3. Claude Code registration
    {
      const configFile = path.join(tmpDir, 'claude.json');
      fs.writeFileSync(configFile, JSON.stringify({
        mcpServers: {
          memory: { command: 'memory-server', args: [] }
        }
      }, null, 2), 'utf-8');

      const bundlePath = '/home/user/.agents/mcp/innfo-mcp.bundle.js';
      const result = registerMcpForClaude({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcpServers['innfo-mcp'], 'innfo-mcp added to mcpServers');
      assert.strictEqual(updated.mcpServers['innfo-mcp'].command, 'node');
      assert.deepStrictEqual(updated.mcpServers['innfo-mcp'].args, [bundlePath]);
      assert(updated.mcpServers.memory, 'existing memory server preserved');
      console.log('✔ Claude Code MCP registration passed');
    }

    // 4. Antigravity registration
    {
      const configFile = path.join(tmpDir, 'mcp_config.json');
      fs.writeFileSync(configFile, JSON.stringify({}, null, 2), 'utf-8');

      const bundlePath = 'C:\\agents\\mcp\\innfo-mcp.bundle.js';
      const results = registerMcpForAntigravity({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(results[0].updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcpServers['innfo-mcp'], 'innfo-mcp added to antigravity mcpServers');
      assert.strictEqual(updated.mcpServers['innfo-mcp'].command, 'node');
      assert.deepStrictEqual(updated.mcpServers['innfo-mcp'].args, [bundlePath]);
      console.log('✔ Antigravity MCP registration passed');
    }

    // 5. Auto & All registration
    {
      const opencodeDir = path.join(tmpDir, '.config', 'opencode');
      const geminiDir = path.join(tmpDir, '.gemini');
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.mkdirSync(geminiDir, { recursive: true });
      const opencodeFile = path.join(opencodeDir, 'opencode.json');
      fs.writeFileSync(opencodeFile, JSON.stringify({ mcp: {} }), 'utf-8');

      const bundlePath = path.join(tmpDir, 'bundle.js');
      const results = registerMcpAuto({
        bundlePath,
        serverName: 'innfo-mcp',
        homedir: tmpDir,
        targetAgent: 'all',
      });

      assert(results.some(r => r.agent === 'opencode' && r.updated), 'Target all updated OpenCode');
      assert(results.some(r => r.agent === 'claude' && r.updated), 'Target all updated Claude');
      assert(results.some(r => r.agent === 'antigravity' && r.updated), 'Target all updated Antigravity');
      console.log('✔ Multi-agent registration (all) passed');
    }

    // 6. D10: registering `nn-mcp` removes a stale `innfo-mcp` key (both formats)
    {
      const configFile = path.join(tmpDir, 'opencode-d10.json');
      fs.writeFileSync(configFile, JSON.stringify({
        mcp: { 'innfo-mcp': { type: 'local', command: ['node', 'old'], cwd: '.', enabled: true } }
      }, null, 2), 'utf-8');

      const bundlePath = path.join(tmpDir, 'nn-mcp.bundle.js');
      const result = registerMcpForOpenCode({ configFile, serverName: 'nn-mcp', bundlePath });
      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert.ok(!updated.mcp['innfo-mcp'], 'the stale innfo-mcp key is removed');
      assert.ok(updated.mcp['nn-mcp'], 'nn-mcp is registered');

      // idempotent: a second identical registration changes nothing
      const again = registerMcpForOpenCode({ configFile, serverName: 'nn-mcp', bundlePath });
      assert.strictEqual(again.updated, false, 're-registering nn-mcp is a no-op');

      const claudeFile = path.join(tmpDir, 'claude-d10.json');
      fs.writeFileSync(claudeFile, JSON.stringify({
        mcpServers: { 'innfo-mcp': { command: 'node', args: ['old'], cwd: '.' } }
      }, null, 2), 'utf-8');
      registerMcpForClaude({ configFile: claudeFile, serverName: 'nn-mcp', bundlePath });
      const claude = readJsonClean(claudeFile);
      assert.ok(!claude.mcpServers['innfo-mcp'], 'the stale innfo-mcp mcpServers key is removed');
      assert.ok(claude.mcpServers['nn-mcp'], 'nn-mcp is registered in mcpServers');
      console.log('✔ D10 stale innfo-mcp config-key migration passed');
    }

    console.log('All mcp-config-adapter unit tests passed successfully!');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  testMcpAdapter().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { testMcpAdapter };
