#!/usr/bin/env node
/**
 * scripts/lib/offline-guard.test.js
 *
 * The offline guard is a fail-CLOSED preload (quality-gates spec, "Offline mode
 * MUST be enforced"). Each case runs a child with `--require offline-guard.js`
 * and asserts the throw happens before any socket I/O: the targets are
 * non-routable or well-known hosts, and the child has a hard timeout, so a
 * guard that failed open would hang or reach the network and fail the test.
 */

const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const guard = path.join(__dirname, 'offline-guard.js');
const { isLoopbackHost } = require('./loopback.js');

function runChild(code, { offline = true, preload = true } = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  if (offline) env.NN_OFFLINE = '1';
  else delete env.NN_OFFLINE;
  const args = preload ? ['--require', guard, '-e', code] : ['-e', code];
  const res = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 20000 });
  assert.strictEqual(res.error, undefined, `child failed to run: ${res.error && res.error.message}`);
  return res;
}

function parse(res) {
  assert.strictEqual(res.status, 0, `child exited ${res.status}: ${res.stderr}`);
  return JSON.parse(res.stdout.trim().split('\n').pop());
}

// 0. Loopback classifier.
for (const host of ['localhost', '127.0.0.1', '127.1.2.3', '::1', '[::1]', 'LOCALHOST', undefined, '']) {
  assert.strictEqual(isLoopbackHost(host), true, `${host} is loopback`);
}
for (const host of ['example.com', '192.0.2.1', '8.8.8.8', 'api.github.com', '127.0.0.1.evil.com']) {
  assert.strictEqual(isLoopbackHost(host), false, `${host} is not loopback`);
}

// 1. Non-loopback net/tls/dns/http/fetch are refused before any I/O.
{
  const res = runChild(`
    const net = require('net'), tls = require('tls'), dns = require('dns'), http = require('http');
    const out = {};
    const code = (fn) => { try { fn(); return 'no-throw'; } catch (e) { return e.code; } };
    out.netIp = code(() => net.connect({ host: '192.0.2.1', port: 80 }));
    out.netPortHost = code(() => net.connect(80, '192.0.2.1'));
    out.tls = code(() => tls.connect({ host: 'example.com', port: 443 }));
    out.dns = code(() => dns.lookup('example.com', () => {}));
    out.httpGet = code(() => http.get('http://192.0.2.1/'));
    (async () => {
      try { await dns.promises.lookup('example.com'); out.dnsPromises = 'no-throw'; } catch (e) { out.dnsPromises = e.code; }
      try { await fetch('https://example.com/'); out.fetch = 'no-throw'; } catch (e) { out.fetch = e.code || e.message; }
      try { await fetch(new URL('https://example.com/')); out.fetchUrl = 'no-throw'; } catch (e) { out.fetchUrl = e.code || e.message; }
      console.log(JSON.stringify(out));
    })();
  `);
  const out = parse(res);
  for (const [k, v] of Object.entries(out)) {
    assert.strictEqual(v, 'ENN_OFFLINE', `${k} must be refused by the guard, got ${v}`);
  }
  console.log('✔ non-loopback connect/tls/dns/http/fetch are refused');
}

// 2. Loopback keeps working (net, http, fetch, localhost name).
{
  const res = runChild(`
    const http = require('http');
    const server = http.createServer((req, res) => res.end('hello'));
    server.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      const out = {};
      out.fetchIp = await (await fetch('http://127.0.0.1:' + port + '/')).text();
      out.fetchLocalhost = await (await fetch('http://localhost:' + port + '/')).text();
      out.http = await new Promise((resolve, reject) =>
        http.get({ host: '127.0.0.1', port }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => resolve(b)); }).on('error', reject));
      console.log(JSON.stringify(out));
      server.close();
    });
  `);
  const out = parse(res);
  assert.deepStrictEqual(out, { fetchIp: 'hello', fetchLocalhost: 'hello', http: 'hello' });
  console.log('✔ loopback traffic stays allowed');
}

// 3. Without NN_OFFLINE=1 the preload installs nothing.
{
  const res = runChild(
    `console.log(JSON.stringify({ patched: Boolean(require('net').Socket.prototype.connect.__nnOfflineGuard) }));`,
    { offline: false },
  );
  assert.deepStrictEqual(parse(res), { patched: false });
  const on = runChild(
    `console.log(JSON.stringify({ patched: Boolean(require('net').Socket.prototype.connect.__nnOfflineGuard) }));`,
  );
  assert.deepStrictEqual(parse(on), { patched: true });
  console.log('✔ guard is inert unless NN_OFFLINE=1');
}

// 4. Stubbing fetch afterwards does not disable the socket-level guard.
{
  const res = runChild(`
    globalThis.fetch = async () => ({ ok: true });
    const net = require('net');
    try { net.connect({ host: '192.0.2.1', port: 80 }); console.log(JSON.stringify({ r: 'no-throw' })); }
    catch (e) { console.log(JSON.stringify({ r: e.code })); }
  `);
  assert.deepStrictEqual(parse(res), { r: 'ENN_OFFLINE' });
  console.log('✔ a fetch stub cannot open the socket layer');
}

console.log('offline-guard tests passed');
