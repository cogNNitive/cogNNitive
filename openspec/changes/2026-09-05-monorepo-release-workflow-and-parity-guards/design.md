# Design: Monorepo Release Workflow & Parity Guards

## Architecture Overview

### 1. Parity Checker (scripts/manifest/check-parity.js)
A lightweight, zero-dependency Node CLI (< 200 lines to satisfy orchestrator line constraints) that:
- Reads and parses manifest/source.yaml.
- Iterates over all skills in skills:
  - Resolves local path ${repoRoot}//SKILL.md.
  - Extracts frontmatter ersion: using existing yaml-parser.js.
  - Compares against skill.version.
- Iterates over all templates in 	emplates:
  - Resolves local path ${repoRoot}/.
  - Extracts version from frontmatter or header.
  - Compares against 	emplate.version.
- Iterates over MCP entries:
  - Checks if iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js exists.
  - Checks if iNNfo/packages/innfo-mcp/package.json has ersion === mcp.version.
- Exits 0 on success, 1 on any discrepancy.

### 2. Integration with scripts/verify.js
- scripts/verify.js executes 
ode scripts/manifest/check-parity.js as Step 1.5 before running typecheck and remote manifest validation.
- This gives immediate local feedback in milliseconds without needing GitHub API tokens or network access.

### 3. Remote MCP Path Verification (scripts/manifest/lib/manifest-rules.js)
- In alidateMcp(entry, policy), call piRequest against https://api.github.com/repos//contents/?ref= or aw.githubusercontent.com.
- If 404 / not found, add violation.

### 4. Skill Modernization (.agents/skills/nn-dev-release/SKILL.md)
- Update description and paths to monorepo root.
- Menu option [a]: audits git status on cogNNitive root and lists recent tags for each domain prefix.
- Menu option [b]: pulls main, runs 
ode scripts/verify.js, and runs tests in iNNfo.
- Menu option [c]: handles full release sequence in monorepo.
- Menu option [d]: manifest validation.
