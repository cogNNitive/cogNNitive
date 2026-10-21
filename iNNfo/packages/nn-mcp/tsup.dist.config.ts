// Dist-only build used by tooling that needs `dist/server.js` — the pre-push
// docs-facts guard and `scripts/generate-docs-facts.mjs`. It reuses the first
// entry of tsup.config.ts (the `dist` config) so it does not rewrite the
// committed `bin/nn-mcp.bundle.js`, which a plain `tsup` build also emits.
import configs from './tsup.config'

export default configs[0]
