import type { DirectoryHandleLike } from '../model/fs-types'
import { parseFrontmatter } from '@cognnitive/innfo-core'
import { SAMPLE_BASE } from '../config/samples'

export type TemplateChoice = 'blank' | 'business' | 'procedures' | 'organization' | 'sandbox'

/**
 * Creates the standard workspace directory structure and support files.
 */
export async function initWorkspaceStructure(
  handle: DirectoryHandleLike,
  modelName: string,
  chosenTemplate: TemplateChoice,
): Promise<void> {
  // Create application-managed directories
  await handle.getDirectoryHandle('specs', { create: true })

  // Create README
  const readmeContent = `# ${modelName}

This workspace was created by iNNfo — a structured knowledge model editor for the iNNfo format.

## Workspace contents

| Path | Purpose |
|------|---------|
| \`index.md\` | Entry point that maps your model structure |
| \`${modelName}_V_1-0-0_${chosenTemplate}_NN.md\` | Your model file |
| \`iNNfo.html\` | Open this to launch the editor |
| \`AGENTS.md\` | AI agent entry point — skill and MCP setup instructions |
| \`specs/\` | Template specifications (auto-managed) |
| \`.backups/\` | Auto-save history (auto-managed) |

## How to edit

- **iNNfo editor**: Open \`iNNfo.html\` in your browser
- **AI agent**: Use Claude Code, OpenCode Desktop, or Antigravity to edit via natural language.
  Your agent MUST read \`AGENTS.md\` first for skill and MCP setup instructions.
`
  const readmeHandle = await handle.getFileHandle('README.md', { create: true })
  if (readmeHandle.createWritable) {
    const w = await readmeHandle.createWritable()
    await w.write(readmeContent)
    await w.close()
  }

  // Create AGENTS.md — AI agent entry point with skill and MCP instructions
  const agentsContent = `# AGENT Instructions

Read this file FIRST when entering this workspace. It tells you how to configure yourself to work with iNNfo models.

## Skills

CogNNitive skills are maintained at \`https://github.com/cogNNitive/actioNN\`. Clone the repo to get all skills:

\`\`\`
git clone https://github.com/cogNNitive/actioNN.git
\`\`\`

### Installing skills per agent

| Agent | Method |
|-------|--------|
| **OpenCode Desktop** | Clone the repo, then run the \`nn-skills-manager\` skill to install via junctions. Skills are auto-discovered from \`~/.config/opencode/skills/\` and project \`.agents/skills/\`. |
| **Claude Code** | Add the SKILL.md file paths to your \`CLAUDE.md\` or reference them in the MCP config. |
| **Antigravity** | Point your agent configuration to the cloned skill directory. |

### Workspace skills triggered by file/task type

| Trigger | Skill |
|---------|-------|
| Editing \`*_NN.md\` files | \`nn-innfo\` |
| Web design, branding, analytics | \`nn-web-design-guide\` |
| Workflow orchestration across skills | \`nn-workflow-orchestrator\` |
| Model cost and tier evaluation | \`nn-opencode-model-router\` |
| Skill lifecycle management | \`nn-skills-manager\` |

## MCP Servers

### innfo-mcp (required for model editing)

The \`innfo-mcp\` server wraps \`@cognnitive/innfo-core\` and provides deterministic model validation, spec resolution, and semantic mutation tools. The agent MUST NOT hand-validate or hand-resolve spec chains when the MCP is available.

**Recommended — zero-clone (CDN bootstrap).** You do NOT need to clone this repo. \`innfo-mcp\` is published as a single auto-updating bundle on the CDN (\`https://innfo.cognnitive.com/cdn/\`). Install the bootstrap script once — it downloads, caches, and auto-updates the bundle, with an offline fallback to the cached copy — then point your agent at it. Full per-platform steps and the script source: https://github.com/iNNfo/iNNfo/blob/main/docs/mcp-setup.md

- **macOS / Linux**: save \`bootstrap.sh\` into \`~/.cache/innfo-mcp/\` and run \`chmod +x\` on it.
- **Windows**: save \`innfo-mcp.ps1\` and \`innfo-mcp.cmd\` into \`%USERPROFILE%\\.cache\\innfo-mcp\\\`.

Then configure the MCP per your agent, pointing \`command\` at the bootstrap script:

**OpenCode Desktop** — add to \`opencode.json\` or \`~/.config/opencode/opencode.jsonc\` (OpenCode Desktop uses the \`mcp\` key with a \`command\` array, NOT \`mcpServers\`):
\`\`\`jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "innfo-mcp": {
      "type": "local",
      "command": ["/home/<you>/.cache/innfo-mcp/bootstrap.sh"],
      "enabled": true
    }
  }
}
\`\`\`

**Claude Code** — add to \`.mcp.json\` (uses the \`mcpServers\` key with a \`command\` + \`args\` split):
\`\`\`jsonc
{
  "mcpServers": {
    "innfo-mcp": {
      "command": "/home/<you>/.cache/innfo-mcp/bootstrap.sh"
    }
  }
}
\`\`\`

**Antigravity** — same \`mcpServers\` shape as Claude Code, with \`command\` pointing at your platform's bootstrap script.

On Windows, use \`%USERPROFILE%\\.cache\\innfo-mcp\\innfo-mcp.cmd\` as the \`command\` instead of the \`bootstrap.sh\` path shown above (see \`docs/mcp-setup.md\` for the exact escaped JSON).

**Alternative — clone-based (contributors).** If you already have \`iNNfo\` cloned, build once with \`npm run build --prefix packages/innfo-mcp\` and point \`command\` at \`node <repo>/packages/innfo-mcp/dist/server.js\` instead. See \`docs/mcp-setup.md\`.

## Workspace structure

| Path | Purpose |
|------|---------|
| \`*_NN.md\` | iNNfo model files |
| \`index.md\` | Entry point with [[wikilinks]] to models |
| \`specs/\` | Spec chain, local + downloaded (auto-managed) |
| \`README.md\` | Workspace overview |
`
  const agentsHandle = await handle.getFileHandle('AGENTS.md', { create: true })
  if (agentsHandle.createWritable) {
    const w = await agentsHandle.createWritable()
    await w.write(agentsContent)
    await w.close()
  }

  // Create iNNfo.html — redirects to the deployed app URL
  const appUrl = import.meta.env.BASE_URL || 'https://innfo.app'
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iNNfo — ${modelName}</title>
  <meta http-equiv="refresh" content="0; url=${appUrl}">
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #333; text-align: center; }
    a { color: #4d0e4e; font-weight: 700; }
  </style>
</head>
<body>
  <p>Redirecting to <a href="${appUrl}">iNNfo</a> — if you are not redirected, click the link.</p>
</body>
</html>`
  const htmlFileHandle = await handle.getFileHandle('iNNfo.html', { create: true })
  if (htmlFileHandle.createWritable) {
    const w = await htmlFileHandle.createWritable()
    await w.write(htmlContent)
    await w.close()
  }
}

/**
 * Creates an index.md entry point for the workspace.
 */
export async function createIndexMd(
  handle: DirectoryHandleLike,
  modelName: string,
  templateName: string,
): Promise<void> {
  const content = `---
spec_version: "V_0-1-5"
level: 0
title: "${modelName} Index"
---
# _NN index
* [[${modelName}_V_1-0-0_${templateName}_NN.md]]
`
  const fileHandle = await handle.getFileHandle('index.md', { create: true })
  if (fileHandle.createWritable) {
    const w = await fileHandle.createWritable()
    await w.write(content)
    await w.close()
  }
}

/**
 * Walks the spec parent chain starting from the chosen template's URL
 * and pre-populates specs/ so both the editor and AI agents have
 * local copies without fetching on first use.
 */
export async function prepopulateSpecs(
  handle: DirectoryHandleLike,
  starterUrl: string,
): Promise<void> {
  const starterResp = await window.fetch(starterUrl)
  if (!starterResp.ok) return
  const starterFm = parseFrontmatter(await starterResp.text())
  if (!starterFm) return

  let currentUrl: string | undefined = (starterFm as any)?.parent_spec?.url
  let currentName: string | undefined = (starterFm as any)?.parent_spec?.name
  let depth = 10

  while (currentUrl && currentName && depth-- > 0) {
    const specsDir = await handle.getDirectoryHandle('specs', { create: true })
    const filename = `${currentName}_NN.md`

    // Skip if already exists
    try {
      const existing = await specsDir.getFileHandle(filename)
      const file = await existing.getFile()
      const fm = parseFrontmatter(await file.text())
      currentUrl = (fm as any)?.parent_spec?.url
      currentName = (fm as any)?.parent_spec?.name
      continue
    } catch {
      // Not found — download
    }

    if (!currentUrl) break
    try {
      const resp = await window.fetch(currentUrl)
      if (!resp.ok) break
      const content = await resp.text()

      const fileHandle = await specsDir.getFileHandle(filename, { create: true })
      if (fileHandle.createWritable) {
        const w = await fileHandle.createWritable()
        await w.write(content)
        await w.close()
      }

      const fm = parseFrontmatter(content)
      currentUrl = (fm as any)?.parent_spec?.url
      currentName = (fm as any)?.parent_spec?.name
    } catch {
      break
    }
  }
}

export function getStarterByTemplate(tpl: TemplateChoice) {
  const starters = [
    {
      id: 'starter-business',
      templateName: 'business',
      url: `${SAMPLE_BASE}/business/samples/Ghostbusters_V_0-2-0_business_NN.md`,
    },
    {
      id: 'starter-procedures',
      templateName: 'procedures',
      url: `${SAMPLE_BASE}/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md`,
    },
    {
      id: 'starter-organization',
      templateName: 'organization',
      url: `${SAMPLE_BASE}/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md`,
    },
  ]
  return starters.find((s) => s.templateName === tpl)
}
