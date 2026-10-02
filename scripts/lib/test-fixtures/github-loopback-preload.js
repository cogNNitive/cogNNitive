/**
 * scripts/lib/test-fixtures/github-loopback-preload.js
 *
 * Test-only `--require` preload that makes a spawned CLI hermetic: it rewrites
 * every GitHub URL (codeload, raw, api) handed to the GitHub client to a
 * loopback server, `http://127.0.0.1:$SM_TEST_GITHUB_PORT/<host><path>`.
 * It patches the client's exports BEFORE `skills-commands.js` destructures them.
 * It needs `SM_TEST_GITHUB_PORT`; without it nothing is rewritten and the
 * offline guard (when active) refuses the real hosts, so this can only make a
 * process more local, never less.
 */

const client = require('../github-client.js');

const GITHUB_HOSTS = new Set(['codeload.github.com', 'raw.githubusercontent.com', 'api.github.com', 'github.com']);

function rewrite(url) {
  const port = process.env.SM_TEST_GITHUB_PORT;
  if (!port) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return url;
  }
  if (!GITHUB_HOSTS.has(parsed.hostname)) return url;
  return `http://127.0.0.1:${port}/${parsed.hostname}${parsed.pathname}${parsed.search}`;
}

for (const name of ['apiRequest', 'fetchString', 'fetchJson', 'downloadFile']) {
  const original = client[name];
  client[name] = (url, ...rest) => original(rewrite(url), ...rest);
}
